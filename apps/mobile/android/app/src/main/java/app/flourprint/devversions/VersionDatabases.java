package app.flourprint.devversions;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.TreeMap;

/**
 * One set of SQLite files per web version (ADR 0023). The plugin opens the database by name, so
 * the set of the selected version lives where the plugin looks (`databases/`) and every other
 * version's set waits in the store. Switching happens at process start, before any connection
 * exists; each step is idempotent, so a process killed in the middle resumes on the next start.
 *
 * <p>Owner file `live.txt`: the version the live files belong to, or `none` between the two halves
 * of a switch. Missing means `dev`: the files that existed before this feature were the dev data.
 */
public final class VersionDatabases {
    /** The plugin's database `flourprint`, and its journal, WAL and shared-memory companions. */
    static final String BASE = "flourprintSQLite.db";

    private static final String NONE = "none";
    private static final String OWNER = "live.txt";

    private final File databases;
    private final File store;

    public VersionDatabases(File databases, File store) {
        this.databases = databases;
        this.store = store;
    }

    static boolean isLiveFile(String name) {
        return name.equals(BASE) || name.startsWith(BASE + "-");
    }

    /** The version the live files belong to, `none` in the middle of a switch. */
    public String liveOwner() {
        File file = new File(store, OWNER);
        if (!file.isFile()) return VersionIds.DEFAULT;
        try {
            String text = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8).trim();
            if (text.equals(NONE)) return NONE;
            String version = VersionIds.parse(text);
            return version == null ? VersionIds.DEFAULT : version;
        } catch (IOException failure) {
            return VersionIds.DEFAULT;
        }
    }

    private void writeOwner(String owner) throws IOException {
        if (!store.isDirectory() && !store.mkdirs()) throw new IOException("cannot create " + store);
        File temporary = new File(store, OWNER + ".tmp");
        Files.write(temporary.toPath(), owner.getBytes(StandardCharsets.UTF_8));
        Files.move(temporary.toPath(), new File(store, OWNER).toPath(), StandardCopyOption.ATOMIC_MOVE,
                StandardCopyOption.REPLACE_EXISTING);
    }

    private File stash(String version) {
        return new File(store, "v-" + version);
    }

    private static void moveFiles(File from, File to, boolean liveOnly) throws IOException {
        File[] files = from.listFiles();
        if (files == null) return;
        if (!to.isDirectory() && !to.mkdirs()) throw new IOException("cannot create " + to);
        for (File file : files) {
            if (!file.isFile() || (liveOnly && !isLiveFile(file.getName()))) continue;
            Files.move(file.toPath(), new File(to, file.getName()).toPath(), StandardCopyOption.ATOMIC_MOVE);
        }
    }

    /** Puts the files of `version` in place; a version without files starts empty. */
    public void activate(String version) throws IOException {
        if (VersionIds.parse(version) == null) throw new IOException("invalid version " + version);
        String owner = liveOwner();
        if (owner.equals(version)) return;
        if (!owner.equals(NONE)) {
            moveFiles(databases, stash(owner), true);
            writeOwner(NONE);
        }
        moveFiles(stash(version), databases, false);
        writeOwner(version);
    }

    private static void deleteTree(File file) throws IOException {
        File[] children = file.listFiles();
        if (children != null) for (File child : children) deleteTree(child);
        Files.deleteIfExists(file.toPath());
    }

    /** Deletes the data of a version that is not loaded, or of the loaded one before it opens. */
    public void purge(String version) throws IOException {
        if (VersionIds.parse(version) == null) throw new IOException("invalid version " + version);
        if (stash(version).exists()) deleteTree(stash(version));
        if (liveOwner().equals(version)) {
            File[] files = databases.listFiles();
            if (files != null) {
                for (File file : files) if (file.isFile() && isLiveFile(file.getName())) Files.deleteIfExists(file.toPath());
            }
            writeOwner(NONE);
        }
    }

    private static long sizeOf(File directory, boolean liveOnly) {
        long total = 0;
        File[] files = directory.listFiles();
        if (files == null) return 0;
        for (File file : files) {
            if (file.isFile() && (!liveOnly || isLiveFile(file.getName()))) total += file.length();
        }
        return total;
    }

    /** Versions that hold a database, with its size in bytes: the live set and every stash. */
    public Map<String, Long> sizes() {
        Map<String, Long> result = new TreeMap<>();
        File[] stashes = store.listFiles();
        if (stashes != null) {
            for (File directory : stashes) {
                String name = directory.getName();
                if (!directory.isDirectory() || !name.startsWith("v-")) continue;
                String version = VersionIds.parse(name.substring(2));
                long bytes = sizeOf(directory, false);
                if (version != null && bytes > 0) result.put(version, bytes);
            }
        }
        String owner = liveOwner();
        long live = sizeOf(databases, true);
        if (!owner.equals(NONE) && live > 0) result.merge(owner, live, Long::sum);
        return result;
    }
}

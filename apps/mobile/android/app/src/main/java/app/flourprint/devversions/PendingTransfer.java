package app.flourprint.devversions;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

/**
 * The one pending "copy my data to this version" (ADR 0023): a file holding the target version,
 * an expiry and the backup JSON, released once to the target version and dropped after ten minutes.
 */
public final class PendingTransfer {
    public static final long TTL_MS = 10 * 60 * 1000L;

    private final File file;

    public PendingTransfer(File file) {
        this.file = file;
    }

    public void stash(String target, String json, long now) throws IOException {
        if (VersionIds.parse(target) == null) throw new IOException("invalid version " + target);
        File parent = file.getParentFile();
        if (parent != null && !parent.isDirectory() && !parent.mkdirs()) throw new IOException("cannot create " + parent);
        String text = target + "\n" + (now + TTL_MS) + "\n" + json;
        Files.write(file.toPath(), text.getBytes(StandardCharsets.UTF_8));
    }

    /** The JSON when `current` is the target and it has not expired; the file is then gone. */
    public String take(String current, long now) throws IOException {
        if (!file.isFile()) return null;
        String text = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
        int first = text.indexOf('\n');
        int second = first < 0 ? -1 : text.indexOf('\n', first + 1);
        if (second < 0) {
            Files.deleteIfExists(file.toPath());
            return null;
        }
        String target = text.substring(0, first);
        long expiresAt;
        try {
            expiresAt = Long.parseLong(text.substring(first + 1, second));
        } catch (NumberFormatException failure) {
            Files.deleteIfExists(file.toPath());
            return null;
        }
        if (now > expiresAt) {
            Files.deleteIfExists(file.toPath());
            return null;
        }
        if (!target.equals(current)) return null;
        Files.deleteIfExists(file.toPath());
        return text.substring(second + 1);
    }
}

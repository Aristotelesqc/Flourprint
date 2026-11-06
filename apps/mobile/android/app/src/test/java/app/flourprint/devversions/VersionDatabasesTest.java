package app.flourprint.devversions;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Map;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class VersionDatabasesTest {
    @Rule public TemporaryFolder temporary = new TemporaryFolder();
    private File databases;
    private File store;
    private VersionDatabases versions;

    @Before
    public void setUp() throws IOException {
        databases = temporary.newFolder("databases");
        store = new File(temporary.getRoot(), "dev-versions");
        versions = new VersionDatabases(databases, store);
    }

    private void write(String name, String text) throws IOException {
        Files.write(new File(databases, name).toPath(), text.getBytes(StandardCharsets.UTF_8));
    }

    private String read(String name) throws IOException {
        return new String(Files.readAllBytes(new File(databases, name).toPath()), StandardCharsets.UTF_8);
    }

    @Test
    public void existingFilesBelongToDev() throws IOException {
        write("flourprintSQLite.db", "dev data");
        assertEquals("dev", versions.liveOwner());
        versions.activate("dev");
        assertEquals("dev data", read("flourprintSQLite.db"));
    }

    @Test
    public void aPullRequestStartsEmptyAndDevDataIsKept() throws IOException {
        write("flourprintSQLite.db", "dev data");
        write("flourprintSQLite.db-wal", "dev wal");
        versions.activate("pr-5");
        assertFalse(new File(databases, "flourprintSQLite.db").exists());
        assertFalse(new File(databases, "flourprintSQLite.db-wal").exists());
        assertEquals("pr-5", versions.liveOwner());
        write("flourprintSQLite.db", "pr data");

        versions.activate("dev");
        assertEquals("dev data", read("flourprintSQLite.db"));
        assertEquals("dev wal", read("flourprintSQLite.db-wal"));
        versions.activate("pr-5");
        assertEquals("pr data", read("flourprintSQLite.db"));
    }

    @Test
    public void otherDatabasesAreNeverMoved() throws IOException {
        write("flourprint-markerSQLite.db", "marker");
        write("flourprintSQLite.db", "dev");
        versions.activate("canary");
        assertEquals("marker", read("flourprint-markerSQLite.db"));
    }

    @Test
    public void resumesASwitchInterruptedAfterTheFirstHalf() throws IOException {
        write("flourprintSQLite.db", "dev data");
        versions.activate("pr-5");
        write("flourprintSQLite.db", "pr data");
        // Interrupted: pr-5's files stashed, owner "none", nothing moved in yet.
        versions.activate("dev");
        File owner = new File(store, "live.txt");
        Files.write(owner.toPath(), "none".getBytes(StandardCharsets.UTF_8));
        File live = new File(databases, "flourprintSQLite.db");
        File stash = new File(store, "v-dev");
        Files.move(live.toPath(), new File(stash, "flourprintSQLite.db").toPath());
        versions.activate("dev");
        assertEquals("dev data", read("flourprintSQLite.db"));
        assertEquals("dev", versions.liveOwner());
    }

    @Test
    public void purgeDeletesAStashedVersionOnly() throws IOException {
        write("flourprintSQLite.db", "dev data");
        versions.activate("pr-5");
        write("flourprintSQLite.db", "pr data");
        versions.purge("dev");
        assertEquals("pr data", read("flourprintSQLite.db"));
        assertFalse(versions.sizes().containsKey("dev"));
        assertTrue(versions.sizes().containsKey("pr-5"));
    }

    @Test
    public void purgeOfTheLiveVersionDeletesItsFilesBeforeTheyOpen() throws IOException {
        write("flourprintSQLite.db", "dev data");
        versions.activate("pr-5");
        write("flourprintSQLite.db", "pr data");
        write("flourprintSQLite.db-journal", "j");
        versions.purge("pr-5");
        assertFalse(new File(databases, "flourprintSQLite.db").exists());
        assertFalse(new File(databases, "flourprintSQLite.db-journal").exists());
        assertEquals("none", versions.liveOwner());
        versions.activate("pr-5");
        assertEquals("pr-5", versions.liveOwner());
        assertFalse(new File(databases, "flourprintSQLite.db").exists());
    }

    @Test
    public void listsVersionsHoldingDataWithTheirSizes() throws IOException {
        write("flourprintSQLite.db", "12345");
        write("flourprintSQLite.db-wal", "678");
        versions.activate("pr-9");
        write("flourprintSQLite.db", "ab");
        Map<String, Long> sizes = versions.sizes();
        assertEquals(Long.valueOf(8), sizes.get("dev"));
        assertEquals(Long.valueOf(2), sizes.get("pr-9"));
        assertEquals(2, sizes.size());
    }

    @Test(expected = IOException.class)
    public void refusesAnInvalidVersion() throws IOException {
        versions.activate("../evil");
    }
}

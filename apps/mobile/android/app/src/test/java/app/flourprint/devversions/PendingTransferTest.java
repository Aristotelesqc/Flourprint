package app.flourprint.devversions;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;

import java.io.File;
import java.io.IOException;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class PendingTransferTest {
    @Rule public TemporaryFolder temporary = new TemporaryFolder();

    @Test
    public void isReleasedOnceToTheTargetOnly() throws IOException {
        File file = new File(temporary.getRoot(), "t/transfer.txt");
        PendingTransfer transfer = new PendingTransfer(file);
        transfer.stash("pr-5", "{\"a\":\n1}", 0);
        assertNull(transfer.take("dev", 1));
        assertEquals("{\"a\":\n1}", transfer.take("pr-5", 1));
        assertNull(transfer.take("pr-5", 1));
        assertFalse(file.exists());
    }

    @Test
    public void expires() throws IOException {
        PendingTransfer transfer = new PendingTransfer(new File(temporary.getRoot(), "transfer.txt"));
        transfer.stash("pr-5", "x", 0);
        assertNull(transfer.take("pr-5", PendingTransfer.TTL_MS + 1));
    }

    @Test(expected = IOException.class)
    public void refusesAnInvalidTarget() throws IOException {
        new PendingTransfer(new File(temporary.getRoot(), "transfer.txt")).stash("evil", "x", 0);
    }
}

package app.flourprint.devversions;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

/** The same accepted and refused addresses as packages/adapters/test/dev-versions.test.ts. */
public class VersionIdsTest {
    private static final String H = VersionIds.HOST;

    @Test
    public void buildsAndRoundTripsEveryForm() {
        assertEquals("https://" + H + "/", VersionIds.addressOf("main"));
        assertEquals("https://dev." + H + "/", VersionIds.addressOf("dev"));
        assertEquals("https://canary." + H + "/", VersionIds.addressOf("canary"));
        assertEquals("https://pr-233." + H + "/", VersionIds.addressOf("pr-233"));
        for (String version : new String[] {"main", "dev", "canary", "pr-1", "pr-233"}) {
            assertEquals(version, VersionIds.versionOfAddress(VersionIds.addressOf(version)));
        }
    }

    @Test
    public void acceptsAPathOnAnAllowedOrigin() {
        assertEquals("pr-7", VersionIds.versionOfAddress("https://pr-7." + H + "/recipes/abc?x=1#y"));
        assertEquals("dev", VersionIds.versionOfAddress("https://DEV." + H.toUpperCase() + "/"));
    }

    @Test
    public void refusesEveryOtherAddress() {
        String[] refused = {
            "http://dev." + H + "/",
            "https://dev." + H + ":8443/",
            "https://user:secret@dev." + H + "/",
            "https://" + H + ".evil.example/",
            "https://dev." + H + ".evil.example/",
            "https://evil-" + H + "/",
            "https://xdev." + H + "/",
            "https://feature-x." + H + "/",
            "https://branch-dev." + H + "/",
            "https://pr-." + H + "/",
            "https://pr-abc." + H + "/",
            "https://pr-0233." + H + "/",
            "https://pr-0." + H + "/",
            "https://pr-12.extra." + H + "/",
            "https://example.com/",
            "file:///etc/passwd",
            "javascript:alert(1)",
            "app://flourprint/",
            "not a url",
            "",
        };
        for (String address : refused) assertNull(address, VersionIds.versionOfAddress(address));
        assertNull(VersionIds.versionOfAddress(null));
    }

    @Test
    public void onlyTheDevApkIsADevApp() {
        assertEquals(true, VersionIds.isDevPackage("app.flourprint.dev"));
        assertEquals(false, VersionIds.isDevPackage("app.flourprint"));
        assertEquals(false, VersionIds.isDevPackage("app.flourprint.devx"));
        assertEquals(false, VersionIds.isDevPackage(null));
    }

    @Test
    public void parsesVersionIdsStrictly() {
        assertEquals("pr-12", VersionIds.parse("pr-12"));
        for (String bad : new String[] {"release", "pr-", "pr-012", "pr-1x", "PR-1", "", null}) {
            assertNull(String.valueOf(bad), VersionIds.parse(bad));
        }
        assertNull(VersionIds.addressOf("evil"));
    }
}

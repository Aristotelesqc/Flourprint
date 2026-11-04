package app.flourprint.devversions;

import java.net.URI;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * The web versions the dev APK can load (ADR 0023) and their addresses. Pure Java: the allowlist
 * mirrors packages/adapters/src/dev-versions (the TypeScript source of truth); both are pinned by
 * the same table of accepted and refused addresses in their tests.
 */
public final class VersionIds {
    public static final String HOST = "flourprint-aristotelesqc.pages.dev";
    public static final String DEFAULT = "dev";

    private static final Pattern PULL = Pattern.compile("pr-[1-9][0-9]{0,8}");

    private VersionIds() {}

    /** A version id (`main`, `dev`, `canary`, `pr-<n>`), or null for anything else. */
    public static String parse(String value) {
        if (value == null) return null;
        if (value.equals("main") || value.equals("dev") || value.equals("canary")) return value;
        return PULL.matcher(value).matches() ? value : null;
    }

    /** The address of a version, always its root; null for an invalid id. */
    public static String addressOf(String version) {
        String id = parse(version);
        if (id == null) return null;
        return id.equals("main") ? "https://" + HOST + "/" : "https://" + id + "." + HOST + "/";
    }

    /**
     * The version an address belongs to, or null: https, no user, password or port, and exactly
     * one of the four host forms. The path is free; only the origin is checked.
     */
    public static String versionOfAddress(String address) {
        if (address == null) return null;
        URI uri;
        try {
            uri = new URI(address);
        } catch (Exception failure) {
            return null;
        }
        String scheme = uri.getScheme();
        String host = uri.getHost();
        if (scheme == null || !scheme.equalsIgnoreCase("https") || host == null) return null;
        if (uri.getRawUserInfo() != null || uri.getPort() != -1) return null;
        host = host.toLowerCase(Locale.ROOT);
        if (host.equals(HOST)) return "main";
        String suffix = "." + HOST;
        if (!host.endsWith(suffix)) return null;
        return parse(host.substring(0, host.length() - suffix.length()));
    }

    /**
     * Whether an application id is the dev APK's. The release APK (`app.flourprint`) registers
     * nothing of the version picker, so its web app finds no host and shows no picker.
     */
    public static boolean isDevPackage(String packageName) {
        return "app.flourprint.dev".equals(packageName);
    }

    public static boolean isPull(String version) {
        return version != null && version.startsWith("pr-");
    }
}

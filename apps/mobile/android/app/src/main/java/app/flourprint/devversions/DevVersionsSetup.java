package app.flourprint.devversions;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.os.Process;
import android.util.Log;
import android.webkit.WebStorage;
import app.flourprint.MainActivity;
import app.flourprint.R;
import com.getcapacitor.CapConfig;
import java.io.File;
import java.io.IOException;
import java.util.Collections;

/**
 * The dev APK's side of the version picker (ADR 0023): which web version is selected, the
 * per-version SQLite file sets, and the address the bridge is created with. Used by the dev APK
 * only: the release APK never calls it (`isDevApp`).
 */
public final class DevVersionsSetup {
    static final String ACTION_RETURN_TO_DEV = "app.flourprint.dev.RETURN_TO_DEV";
    private static final String TAG = "FlourprintDevVersions";
    private static final String PREFERENCES = "dev-versions";
    private static final String SELECTED = "selected";
    private static final String PURGE = "purge";

    private DevVersionsSetup() {}

    /** The dev APK has the application id `app.flourprint.dev`; the release APK does not. */
    public static boolean isDevApp(Context context) {
        return VersionIds.isDevPackage(context.getPackageName());
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    static String selected(Context context) {
        String version = VersionIds.parse(preferences(context).getString(SELECTED, null));
        return version == null ? VersionIds.DEFAULT : version;
    }

    static void setSelected(Context context, String version) {
        preferences(context).edit().putString(SELECTED, version).commit();
    }

    static void schedulePurge(Context context, String version) {
        preferences(context).edit().putString(PURGE, version).commit();
    }

    static VersionDatabases databases(Context context) {
        File databases = context.getDatabasePath("flourprint").getParentFile();
        return new VersionDatabases(databases, new File(context.getFilesDir(), "dev-versions"));
    }

    static PendingTransfer transfer(Context context) {
        return new PendingTransfer(new File(new File(context.getFilesDir(), "dev-versions"), "transfer.txt"));
    }

    /** Deletes the web view's storage (local storage, IndexedDB, caches) of one address. */
    static void deleteWebStorage(String version) {
        String address = VersionIds.addressOf(version);
        if (address == null) return;
        WebStorage.getInstance().deleteOrigin(address.substring(0, address.length() - 1));
    }

    /**
     * Runs before the bridge exists, in a process whose database has not been opened: applies a
     * pending deletion, puts the selected version's database files in place and returns the
     * configuration that loads its address, or null to keep the built-in one (`dev`).
     */
    public static CapConfig prepare(Activity activity, Intent intent) {
        if (intent != null && ACTION_RETURN_TO_DEV.equals(intent.getAction())) {
            setSelected(activity, VersionIds.DEFAULT);
        }
        String selected = selected(activity);
        VersionDatabases databases = databases(activity);
        SharedPreferences preferences = preferences(activity);
        try {
            String purge = VersionIds.parse(preferences.getString(PURGE, null));
            if (purge != null) {
                databases.purge(purge);
                deleteWebStorage(purge);
            }
            preferences.edit().remove(PURGE).commit();
            databases.activate(selected);
        } catch (IOException | RuntimeException failure) {
            Log.e(TAG, "Could not switch to " + selected, failure);
            // Keep the version whose files are in place rather than open another one's data.
            String owner = databases.liveOwner();
            selected = VersionIds.parse(owner) == null ? VersionIds.DEFAULT : owner;
            setSelected(activity, selected);
        }
        String address = selected.equals(VersionIds.DEFAULT) ? null : VersionIds.addressOf(selected);
        return address == null ? null : new CapConfig.Builder(activity).setServerUrl(address).create();
    }

    /** A new launch from the shortcut while the app runs: back to `dev` now. */
    public static void handleNewIntent(Activity activity, Intent intent) {
        if (intent == null || !ACTION_RETURN_TO_DEV.equals(intent.getAction())) return;
        if (selected(activity).equals(VersionIds.DEFAULT)) return;
        setSelected(activity, VersionIds.DEFAULT);
        restart(activity);
    }

    /** Long-press on the launcher icon: "Return to dev", for a version that has no picker. */
    public static void publishShortcut(Activity activity) {
        if (Build.VERSION.SDK_INT < 25) return;
        try {
            ShortcutManager manager = activity.getSystemService(ShortcutManager.class);
            if (manager == null) return;
            Intent intent = new Intent(activity, MainActivity.class).setAction(ACTION_RETURN_TO_DEV);
            ShortcutInfo shortcut = new ShortcutInfo.Builder(activity, "return-to-dev")
                    .setShortLabel(activity.getString(R.string.shortcut_return_dev))
                    .setIcon(Icon.createWithResource(activity, R.mipmap.ic_launcher_dev))
                    .setIntent(intent)
                    .build();
            manager.setDynamicShortcuts(Collections.singletonList(shortcut));
        } catch (RuntimeException failure) {
            Log.w(TAG, "Shortcut not published", failure);
        }
    }

    /** Restarts the whole process, so the next start applies the selection before any database opens. */
    public static void restart(Activity activity) {
        Intent launch = activity.getPackageManager().getLaunchIntentForPackage(activity.getPackageName());
        if (launch == null) return;
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        Intent restart = new Intent(activity, RestartActivity.class);
        restart.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        restart.putExtra(RestartActivity.NEXT, launch);
        restart.putExtra(RestartActivity.PID, Process.myPid());
        activity.startActivity(restart);
    }
}

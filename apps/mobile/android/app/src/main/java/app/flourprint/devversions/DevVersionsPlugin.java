package app.flourprint.devversions;

import android.app.Activity;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.util.Map;

/**
 * Capacitor plugin `DevVersions` (ADR 0023), registered by the dev APK only: the web app finds it
 * absent in the release APK and shows no picker. Every version id is validated here again.
 */
@CapacitorPlugin(name = "DevVersions")
public class DevVersionsPlugin extends Plugin {
    private String versionOf(PluginCall call) {
        String version = VersionIds.parse(call.getString("version"));
        if (version == null) call.reject("Invalid version");
        return version;
    }

    @PluginMethod
    public void current(PluginCall call) {
        JSObject result = new JSObject();
        result.put("version", DevVersionsSetup.selected(getContext()));
        call.resolve(result);
    }

    /** Selects a version and restarts the app on it. */
    @PluginMethod
    public void select(PluginCall call) {
        String version = versionOf(call);
        if (version == null) return;
        if (!version.equals(DevVersionsSetup.selected(getContext()))) {
            DevVersionsSetup.setSelected(getContext(), version);
            call.resolve();
            DevVersionsSetup.restart(getActivity());
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void listData(PluginCall call) {
        JSArray entries = new JSArray();
        for (Map.Entry<String, Long> entry : DevVersionsSetup.databases(getContext()).sizes().entrySet()) {
            JSObject item = new JSObject();
            item.put("version", entry.getKey());
            item.put("bytes", entry.getValue());
            entries.put(item);
        }
        JSObject result = new JSObject();
        result.put("entries", entries);
        call.resolve(result);
    }

    /**
     * Deletes one version's data. The loaded version's files are open: its deletion is applied at
     * the next process start, before anything opens them, and the app restarts now.
     */
    @PluginMethod
    public void deleteData(PluginCall call) {
        String version = versionOf(call);
        if (version == null) return;
        if (version.equals(DevVersionsSetup.selected(getContext()))) {
            DevVersionsSetup.schedulePurge(getContext(), version);
            call.resolve();
            DevVersionsSetup.restart(getActivity());
            return;
        }
        try {
            DevVersionsSetup.databases(getContext()).purge(version);
        } catch (IOException failure) {
            call.reject("Could not delete the data", failure);
            return;
        }
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            DevVersionsSetup.deleteWebStorage(version);
            call.resolve();
        });
    }

    @PluginMethod
    public void stashTransfer(PluginCall call) {
        String version = versionOf(call);
        String json = call.getString("json");
        if (version == null) return;
        if (json == null) {
            call.reject("Nothing to copy");
            return;
        }
        try {
            DevVersionsSetup.transfer(getContext()).stash(version, json, System.currentTimeMillis());
            call.resolve();
        } catch (IOException failure) {
            call.reject("Could not keep the copy", failure);
        }
    }

    @PluginMethod
    public void takeTransfer(PluginCall call) {
        try {
            String json = DevVersionsSetup.transfer(getContext())
                    .take(DevVersionsSetup.selected(getContext()), System.currentTimeMillis());
            JSObject result = new JSObject();
            if (json != null) result.put("json", json);
            call.resolve(result);
        } catch (IOException failure) {
            call.reject("Could not read the copy", failure);
        }
    }
}

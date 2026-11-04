package app.flourprint;

import android.content.Intent;
import android.os.Bundle;
import app.flourprint.devversions.DevVersionsPlugin;
import app.flourprint.devversions.DevVersionsSetup;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The dev APK only (ADR 0023): choose the web version before the bridge exists. The
        // release APK skips all of it.
        if (DevVersionsSetup.isDevApp(this)) {
            registerPlugin(DevVersionsPlugin.class);
            CapConfig selected = DevVersionsSetup.prepare(this, getIntent());
            if (selected != null) this.config = selected;
            DevVersionsSetup.publishShortcut(this);
        }
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (DevVersionsSetup.isDevApp(this)) DevVersionsSetup.handleNewIntent(this, intent);
    }
}

package app.flourprint.devversions;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Process;

/**
 * Runs in its own process (`:restart`): ends the app's main process, then starts the app again, so
 * a version switch begins in a fresh process with no database open (ADR 0023). Inert unless the
 * dev APK starts it; the release APK declares it and never does.
 */
public class RestartActivity extends Activity {
    static final String NEXT = "next";
    static final String PID = "pid";

    @SuppressWarnings("deprecation")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Intent next = getIntent().getParcelableExtra(NEXT);
        int pid = getIntent().getIntExtra(PID, -1);
        if (pid > 0) Process.killProcess(pid);
        if (next != null) startActivity(next);
        finish();
        Runtime.getRuntime().exit(0);
    }
}

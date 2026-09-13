package com.craftyoils.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

// Crafty Oils is a fully static, client-side game (HTML/CSS/JS using
// localStorage for game state) — this Activity is just a WebView shell
// that loads it from the app's own assets. No network permission is
// requested because nothing here ever leaves the device.
public class MainActivity extends Activity {

    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        // The game's Collection/turn history persists via localStorage —
        // without DOM storage enabled, every reset would look permanent.
        settings.setDomStorageEnabled(true);

        // Per Android's own WebView "unsafe file inclusion" guidance: an app
        // that only ever loads its own bundled assets should explicitly
        // disable general file:// and content:// access rather than rely on
        // (version-dependent) defaults. file:///android_asset/ and
        // file:///android_res/ — the only paths this app actually loads —
        // stay reachable regardless of these settings; only arbitrary
        // filesystem/content-provider access is being turned off here.
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);

        // Keeps the title screen <-> Dig Grid navigation inside the app's
        // own WebView instead of handing file:// links to an external app.
        webView.setWebViewClient(new WebViewClient());

        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}

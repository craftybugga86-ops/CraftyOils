package com.craftyoils.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.net.URISyntaxException;

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

        // Tells the shared Crafty bar (js/crafty-bar.js) it is inside a Crafty
        // Android app, so other Crafty apps open as apps rather than web pages.
        settings.setUserAgentString(settings.getUserAgentString() + " CraftyApp/works");

        // Keeps the title screen <-> Dig Grid navigation inside the app's
        // own WebView. Links out of the game (other Crafty apps from the
        // "Crafty apps" panel) go to the system instead: this app still has
        // no network permission of its own.
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return openOutside(request.getUrl().toString());
            }
        });

        webView.loadUrl("file:///android_asset/index.html");
    }

    // file:///android_asset/ pages stay in the WebView; anything else leaves the app.
    private boolean openOutside(String url) {
        if (url.startsWith("file:///android_asset/")) return false;
        try {
            Intent intent;
            if (url.startsWith("intent:")) {
                // Only the package name is taken from the link; the intent is always a
                // plain "open this app" launch, never whatever the link asks for.
                String pkg = Intent.parseUri(url, Intent.URI_INTENT_SCHEME).getPackage();
                if (pkg == null || !pkg.matches("[A-Za-z0-9_.]+")) return true;
                intent = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER).setPackage(pkg);
            } else if (url.startsWith("https:") || url.startsWith("http:")) {
                intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            } else {
                return true;
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (URISyntaxException | ActivityNotFoundException e) {
            // Not installed: stay where we are.
        }
        return true;
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

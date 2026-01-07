package com.bookwise.client;

import android.content.Intent;
import com.getcapacitor.BridgeActivity;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
        // Intentionally left blank. This method signals that MainActivity has been modified
        // to support the SocialLogin plugin when using custom scopes or offline mode.
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        try {
            SocialLoginPlugin plugin = (SocialLoginPlugin) this.getBridge().getPlugin("SocialLogin");
            if (plugin != null) {
                plugin.handleGoogleLoginIntent(requestCode, data);
            }
        } catch (Exception e) {
            // Ignore exceptions here. Plugin may not be installed or initialized yet.
        }
    }
}

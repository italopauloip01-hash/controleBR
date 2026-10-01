package com.controlefinanceiro.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "UpdatePlugin")
public class UpdatePlugin extends Plugin {

    @PluginMethod
    public void checkUpdate(PluginCall call) {
        try {
            UpdateManager updateManager = new UpdateManager(getContext());
            updateManager.checkUpdate("https://api.github.com/repos/italopauloip01-hash/controleBR/releases/latest");
            
            JSObject ret = new JSObject();
            ret.put("status", "checking");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao iniciar verificação de atualização: " + e.getMessage());
        }
    }

    @PluginMethod
    public void downloadUpdate(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("URL do APK não fornecida.");
            return;
        }

        try {
            UpdateManager updateManager = new UpdateManager(getContext());
            updateManager.startDirectDownload(url);
            
            JSObject ret = new JSObject();
            ret.put("status", "downloading");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao iniciar download: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getAppVersion(PluginCall call) {
        try {
            String versionName = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0).versionName;
            long versionCode;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                versionCode = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0).getLongVersionCode();
            } else {
                versionCode = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0).versionCode;
            }

            JSObject ret = new JSObject();
            ret.put("versionName", versionName);
            ret.put("versionCode", versionCode);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao obter versão do app: " + e.getMessage());
        }
    }
}

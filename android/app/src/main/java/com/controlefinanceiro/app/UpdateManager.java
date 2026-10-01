package com.controlefinanceiro.app;

import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import androidx.core.content.FileProvider;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class UpdateManager {

    private static final String TAG = "UpdateManager";
    private final Context context;

    public UpdateManager(Context context) {
        this.context = context;
    }

    /**
     * Verifica se há atualizações na API de Releases do GitHub.
     */
    public void checkUpdate(final String githubApiUrl) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL(githubApiUrl);
                    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                    connection.setRequestMethod("GET");
                    connection.setRequestProperty("User-Agent", "Android-App-Updater");
                    connection.connect();

                    if (connection.getResponseCode() == HttpURLConnection.HTTP_OK) {
                        BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) {
                            sb.append(line);
                        }
                        reader.close();

                        JSONObject json = new JSONObject(sb.toString());
                        String tagName = json.getString("tag_name").replaceAll("[^0-9]", "").trim();
                        long serverVersionCode = tryParseLong(tagName);

                        JSONArray assets = json.getJSONArray("assets");
                        String apkUrl = null;

                        for (int i = 0; i < assets.length(); i++) {
                            JSONObject asset = assets.getJSONObject(i);
                            String name = asset.getString("name");
                            if (name.endsWith(".apk")) {
                                apkUrl = asset.getString("browser_download_url");
                                break;
                            }
                        }

                        long currentVersionCode;
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                            currentVersionCode = context.getPackageManager().getPackageInfo(context.getPackageName(), 0).getLongVersionCode();
                        } else {
                            currentVersionCode = (long) context.getPackageManager().getPackageInfo(context.getPackageName(), 0).versionCode;
                        }

                        Log.i(TAG, "Checagem: Atual: " + currentVersionCode + " | Disponível: " + serverVersionCode);
                        
                        if (serverVersionCode > currentVersionCode && apkUrl != null) {
                            final String finalApkUrl = apkUrl;
                            new Handler(Looper.getMainLooper()).post(new Runnable() {
                                @Override
                                public void run() {
                                    showUpdateDialog(finalApkUrl);
                                }
                            });
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Erro ao verificar atualização", e);
                }
            }
        }).start();
    }

    public void showUpdateDialog(final String apkUrl) {
        new AlertDialog.Builder(context)
                .setTitle("Nova Atualização")
                .setMessage("Uma nova versão do app está disponível. Deseja baixar e instalar?")
                .setPositiveButton("Atualizar Agora", (dialog, which) -> startDirectDownload(apkUrl))
                .setNegativeButton("Depois", null)
                .setCancelable(false)
                .show();
    }

    /**
     * Inicia o download diretamente (usado pelo Javascript do banner).
     */
    public void startDirectDownload(final String apkUrl) {
        Log.i(TAG, "Iniciando download direto de: " + apkUrl);
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    // Segue redirecionamentos manualmente (comum no GitHub Assets)
                    URL url = new URL(apkUrl);
                    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                    connection.setInstanceFollowRedirects(true);
                    connection.setRequestProperty("User-Agent", "Android-App-Updater");
                    
                    int status = connection.getResponseCode();
                    Log.i(TAG, "Status da conexão inicial: " + status);

                    // Redirecionamento manual se necessário
                    if (status == HttpURLConnection.HTTP_MOVED_TEMP || 
                        status == HttpURLConnection.HTTP_MOVED_PERM || 
                        status == 307 || status == 308) {
                        String newUrl = connection.getHeaderField("Location");
                        Log.i(TAG, "Redirecionando para: " + newUrl);
                        connection = (HttpURLConnection) new URL(newUrl).openConnection();
                        connection.setRequestProperty("User-Agent", "Android-App-Updater");
                    }

                    File downloadDir = context.getExternalFilesDir("Download");
                    if (downloadDir != null && !downloadDir.exists()) {
                        downloadDir.mkdirs();
                    }
                    
                    final File destinationFile = new File(downloadDir, "update.apk");
                    if (destinationFile.exists()) {
                        destinationFile.delete();
                    }

                    InputStream inputStream = connection.getInputStream();
                    FileOutputStream outputStream = new FileOutputStream(destinationFile);

                    byte[] buffer = new byte[8192];
                    int len;
                    long total = 0;
                    while ((len = inputStream.read(buffer)) != -1) {
                        total += len;
                        outputStream.write(buffer, 0, len);
                    }

                    outputStream.close();
                    inputStream.close();
                    Log.i(TAG, "Download concluído: " + total + " bytes. Iniciando instalação.");

                    new Handler(Looper.getMainLooper()).post(new Runnable() {
                        @Override
                        public void run() {
                            installApk(destinationFile);
                        }
                    });
                } catch (Exception e) {
                    Log.e(TAG, "Erro ao baixar APK: " + e.getMessage(), e);
                }
            }
        }).start();
    }

    private void installApk(File file) {
        Uri uri = FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                file
        );

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        try {
            context.startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao iniciar instalação: " + e.getMessage(), e);
        }
    }

    private long tryParseLong(String value) {
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}

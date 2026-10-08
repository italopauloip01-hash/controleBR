package com.controlefinanceiro.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.controlefinanceiro.app.UpdatePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Registrar o plugin personalizado para que o Capacitor o encontre
        registerPlugin(UpdatePlugin.class);

        super.onCreate(savedInstanceState);
        
        // Inicializar verificação de atualização automática no boot nativo
        UpdateManager updateManager = new UpdateManager(this);
        updateManager.checkUpdate("https://api.github.com/repos/italopauloip01-hash/controleBR/releases/latest");
    }
}

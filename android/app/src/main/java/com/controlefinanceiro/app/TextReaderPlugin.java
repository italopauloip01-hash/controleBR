package com.controlefinanceiro.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Rect;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

/**
 * Lê texto de imagens no próprio aparelho com o Google ML Kit (offline e gratuito).
 * Usado para importar KM, litros e valor das fotos da bomba e do painel.
 */
@CapacitorPlugin(name = "TextReaderPlugin")
public class TextReaderPlugin extends Plugin {

    private TextRecognizer recognizer;

    @Override
    public void load() {
        recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
    }

    @PluginMethod
    public void recognize(PluginCall call) {
        String base64 = call.getString("image");
        if (base64 == null || base64.isEmpty()) {
            call.reject("Imagem não fornecida.");
            return;
        }

        final Bitmap bitmap;
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (Exception e) {
            call.reject("Imagem inválida: " + e.getMessage());
            return;
        }
        if (bitmap == null) {
            call.reject("Não foi possível abrir a imagem.");
            return;
        }

        InputImage image = InputImage.fromBitmap(bitmap, 0);
        recognizer.process(image)
            .addOnSuccessListener(result -> {
                JSArray lines = new JSArray();
                for (Text.TextBlock block : result.getTextBlocks()) {
                    for (Text.Line line : block.getLines()) {
                        JSObject item = new JSObject();
                        item.put("text", line.getText());
                        Rect box = line.getBoundingBox();
                        if (box != null) {
                            item.put("left", box.left);
                            item.put("top", box.top);
                            item.put("right", box.right);
                            item.put("bottom", box.bottom);
                        }
                        lines.put(item);
                    }
                }

                JSObject ret = new JSObject();
                ret.put("text", result.getText());
                ret.put("lines", lines);
                ret.put("width", bitmap.getWidth());
                ret.put("height", bitmap.getHeight());
                call.resolve(ret);
            })
            .addOnFailureListener(e -> call.reject("Falha ao ler a imagem: " + e.getMessage()));
    }
}

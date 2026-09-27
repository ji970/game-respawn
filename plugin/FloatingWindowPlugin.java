package com.respawn.floating;

import org.json.JSONArray;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

import io.dcloud.common.DHInterface.IWebview;
import io.dcloud.common.DHInterface.StandardFeature;

/**
 * 悬浮窗插件（5+ App / HTML5+ 原生插件）
 * 方法（异步，主线程执行）：
 *   show(IWebview, JSONArray)   — 显示悬浮窗，参数 [callbackId, text]
 *   hide(IWebview, JSONArray)   — 隐藏悬浮窗，参数 [callbackId]
 *   update(IWebview, JSONArray) — 更新文本，参数 [callbackId, text]
 */
public class FloatingWindowPlugin extends StandardFeature {

    private static WindowManager wm;
    private static LinearLayout floatView;
    private static TextView floatText;
    private static WindowManager.LayoutParams params;
    private static float downX, downY, startX, startY;

    public void show(IWebview webview, JSONArray array) {
        final String text = array.optString(1);
        final Activity activity = webview.getActivity();
        if (activity == null) return;
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                showFloat(activity, text);
            }
        });
    }

    public void hide(IWebview webview, JSONArray array) {
        final Activity activity = webview.getActivity();
        if (activity == null) return;
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                hideFloat();
            }
        });
    }

    public void update(IWebview webview, JSONArray array) {
        final String text = array.optString(1);
        final Activity activity = webview.getActivity();
        if (activity == null) return;
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (floatText != null) floatText.setText(text);
            }
        });
    }

    private void showFloat(Activity activity, String text) {
        if (floatView != null) {
            if (floatText != null) floatText.setText(text);
            return;
        }
        try {
            wm = (WindowManager) activity.getSystemService(Context.WINDOW_SERVICE);

            int type;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                type = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
            } else {
                type = WindowManager.LayoutParams.TYPE_PHONE;
            }

            params = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    type,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                    PixelFormat.TRANSLUCENT);
            params.gravity = Gravity.TOP | Gravity.LEFT;
            params.x = 20;
            params.y = 500;

            floatView = new LinearLayout(activity);
            floatView.setOrientation(LinearLayout.VERTICAL);
            floatView.setPadding(44, 34, 44, 34);
            floatView.setBackgroundColor(0xCC0F0F1A);

            floatText = new TextView(activity);
            floatText.setText(text == null ? "" : text);
            floatText.setTextColor(Color.WHITE);
            floatText.setTextSize(13);
            floatView.addView(floatText);

            floatView.setOnTouchListener(new View.OnTouchListener() {
                @Override
                public boolean onTouch(View v, MotionEvent event) {
                    switch (event.getAction()) {
                        case MotionEvent.ACTION_DOWN:
                            downX = event.getRawX();
                            downY = event.getRawY();
                            startX = params.x;
                            startY = params.y;
                            return true;
                        case MotionEvent.ACTION_MOVE:
                            float dx = event.getRawX() - downX;
                            float dy = event.getRawY() - downY;
                            params.x = Math.round(startX + dx);
                            params.y = Math.round(startY + dy);
                            wm.updateViewLayout(floatView, params);
                            return true;
                        case MotionEvent.ACTION_UP:
                            float dx2 = event.getRawX() - downX;
                            float dy2 = event.getRawY() - downY;
                            if (Math.abs(dx2) < 12 && Math.abs(dy2) < 12) {
                                launchMain(activity);
                            }
                            return true;
                    }
                    return false;
                }
            });

            wm.addView(floatView, params);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void hideFloat() {
        try {
            if (wm != null && floatView != null) {
                wm.removeView(floatView);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        floatView = null;
        floatText = null;
        wm = null;
        params = null;
    }

    private void launchMain(Activity activity) {
        try {
            Intent intent = activity.getPackageManager()
                    .getLaunchIntentForPackage(activity.getPackageName());
            if (intent != null) {
                intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                activity.startActivity(intent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

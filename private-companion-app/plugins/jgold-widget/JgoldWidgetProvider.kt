package com.jevangoldsmith.privatecompanion

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

class JgoldWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    ids.forEach { id ->
      val views = RemoteViews(context.packageName, R.layout.jgold_widget)
      val routes = listOf(R.id.jgold_open to "/", R.id.jgold_home to "/", R.id.jgold_library to "/books", R.id.jgold_studio to "/website", R.id.jgold_site to "/ai")
      routes.forEachIndexed { index, (viewId, route) ->
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("privatecompanionapp://$route"), context, MainActivity::class.java).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        views.setOnClickPendingIntent(viewId, PendingIntent.getActivity(context, index, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
      }
      manager.updateAppWidget(id, views)
    }
  }
}

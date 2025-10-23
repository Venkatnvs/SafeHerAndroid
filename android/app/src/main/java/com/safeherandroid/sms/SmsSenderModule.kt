package com.safeherandroid.sms

import android.telephony.SmsManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SmsSenderModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "SmsSender"

  @ReactMethod
  fun sendDirectSms(phoneNumber: String, message: String, promise: Promise) {
    try {
      val cleanedNumber = phoneNumber.replace(Regex("[^\\d+]"), "")
      val smsManager = SmsManager.getDefault()

      // Split message if too long for single SMS segment
      val parts = smsManager.divideMessage(message)
      if (parts.size > 1) {
        smsManager.sendMultipartTextMessage(cleanedNumber, null, parts, null, null)
      } else {
        smsManager.sendTextMessage(cleanedNumber, null, message, null, null)
      }

      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("SMS_SEND_FAILED", e)
    }
  }
}



import { apiInitializer } from "discourse/lib/api";
import { service } from "@ember/service";
import Component from "@ember/component";
import { inject as controller } from "@ember/controller";
import { scheduleOnce } from "@ember/runloop";
import I18n from "I18n";

// Utility
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}
function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

// Simple cookie logic
function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    let date = new Date();
    date.setTime(date.getTime() + (days*24*60*60*1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}
function getCookie(name) {
  let nameEQ = name + "=";
  let ca = document.cookie.split(';');
  for(let i=0;i < ca.length;i++) {
    let c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
}

// Modal component
export default apiInitializer("0.11.1", api => {
  api.includePostScript();
  api.registerCustomModal("install-landing-modal", {
    templateName: "install-landing-modal",
    title: "",
    class: "install-landing-modal",
    dismissable: true
  });

  // Show logic
  scheduleOnce("afterRender", () => {
    const cookieKey = "_zenethe_landing_dismiss";
    if (
      getCookie(cookieKey) ||
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone
    ) return;

    const delay = parseInt(settings.timer_delay_ms, 10) || 2000;

    let is_ios = settings.show_on_ios && isIOS();
    let is_android = settings.show_on_android && isAndroid();

    if (!is_ios && !is_android) return;

    let android_deferredPrompt = null;
    if (is_android) {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        android_deferredPrompt = e;
      });
    }

    setTimeout(() => {
      api.showModal("install-landing-modal", {
        model: {
          isIOS: is_ios,
          isAndroid: is_android,
          canPromptAndroid: is_android && android_deferredPrompt !== null,
          promptAndroidInstall: function() {
            if (android_deferredPrompt) {
              android_deferredPrompt.prompt();
              android_deferredPrompt.userChoice.then(() => {
                android_deferredPrompt = null;
              });
            }
          }
        },
        closeModal: () => {
          setCookie(cookieKey, "1", settings.cookie_days);
        },
      });
    }, delay);
  });
});

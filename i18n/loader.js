/* i18n — i18next + browser language detector + HTTP backend (vendored in /vendor).
   English is written in the HTML (fallback without JS); other languages come from i18n/<lng>.json. */
(function(){
  var SUPPORTED=['en','fr'], STORE='ql-lang';
  var root=document.documentElement;

  function tr(key,fallback){
    return (window.i18next&&i18next.isInitialized)?i18next.t(key,{defaultValue:fallback}):fallback;
  }
  window.qlT=tr;

  function base(l){return (l||'en').toLowerCase().split('-')[0]}

  function setMeta(sel,attr,val){var el=document.querySelector(sel);if(el&&val)el.setAttribute(attr,val)}

  function apply(){
    var t=function(k){var v=i18next.t(k);return v===k?null:v};
    document.querySelectorAll('[data-i18n]').forEach(function(el){var v=t(el.getAttribute('data-i18n'));if(v!==null)el.innerHTML=v});
    document.querySelectorAll('[data-i18n-attr]').forEach(function(el){
      var i=el.getAttribute('data-i18n-attr').indexOf(':');
      var spec=el.getAttribute('data-i18n-attr');
      var v=t(spec.slice(i+1));if(v!==null)el.setAttribute(spec.slice(0,i),v);
    });
    var lng=base(i18next.language);
    root.lang=lng;
    if(t('meta.title'))document.title=t('meta.title');
    setMeta('meta[name="description"]','content',t('meta.description'));
    setMeta('meta[property="og:title"]','content',t('meta.title'));
    setMeta('meta[property="og:description"]','content',t('meta.og_description'));
    setMeta('meta[property="og:locale"]','content',lng==='fr'?'fr_FR':'en_US');
    if(window.__setRoles)window.__setRoles(i18next.t('js.roles',{returnObjects:true}));
  }

  function ready(){root.classList.remove('i18n-pending')}

  function init(){
    if(!window.i18next||!window.i18nextHttpBackend||!window.i18nextBrowserLanguageDetector){ready();return}
    var qs=(location.search.match(/[?&]lang=([a-zA-Z-]+)/)||[])[1];
    if(qs&&SUPPORTED.indexOf(base(qs))>-1){try{localStorage.setItem(STORE,base(qs))}catch(e){}}
    i18next.use(i18nextHttpBackend).use(i18nextBrowserLanguageDetector).init({
      supportedLngs:SUPPORTED,nonExplicitSupportedLngs:true,load:'languageOnly',
      fallbackLng:'en',
      keySeparator:false,nsSeparator:false,
      interpolation:{escapeValue:false},
      backend:{loadPath:'i18n/{{lng}}.json'},
      detection:{order:['querystring','localStorage','navigator'],lookupQuerystring:'lang',lookupLocalStorage:STORE,caches:[]}
    }).then(function(){apply();ready();bindSwitch()},function(){ready()});
  }

  function bindSwitch(){
    var btn=document.getElementById('langBtn');
    if(!btn)return;
    btn.addEventListener('click',function(){
      var next=base(i18next.language)==='fr'?'en':'fr';
      try{localStorage.setItem(STORE,next)}catch(e){}
      i18next.changeLanguage(next).then(apply);
    });
  }

  init();
})();

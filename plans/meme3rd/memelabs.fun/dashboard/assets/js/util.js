/* Shared helpers, defined exactly once.

   These helpers used to be copy-pasted into every page. In portfolio.html that
   copy was corrupted (the HTML entities had been decoded back into literal
   characters), which made the whole <script> block a SyntaxError and left the
   page with no escaping at all. One definition, no copies.

   The entity table below is assembled from character codes on purpose. Writing
   "&" and friends as literals is how the original corruption happened: any
   tool that treats this as HTML/markdown decodes them in place, silently
   turning the escaping table into an identity map. Character codes cannot be
   mangled that way.
*/
(function (global) {
    'use strict';

    var AMP = String.fromCharCode(38);   /* ampersand */
    var ENTITIES = {};
    ENTITIES[String.fromCharCode(38)] = AMP + 'amp;';
    ENTITIES[String.fromCharCode(60)] = AMP + 'lt;';
    ENTITIES[String.fromCharCode(62)] = AMP + 'gt;';
    ENTITIES[String.fromCharCode(34)] = AMP + 'quot;';
    ENTITIES[String.fromCharCode(39)] = AMP + '#39;';
    ENTITIES[String.fromCharCode(96)] = AMP + '#96;';

    var UNSAFE_CHAR = new RegExp('[' + AMP + '<>' + String.fromCharCode(34) +
                                 String.fromCharCode(39) + String.fromCharCode(96) + ']', 'g');

    /* Escape untrusted values before interpolating them into an HTML string.
       Token symbols/names come from DexScreener and are attacker-controlled:
       anyone can deploy a token whose metadata contains markup. */
    function esc(v) {
        return String(v == null ? '' : v).replace(UNSAFE_CHAR, function (c) {
            return ENTITIES[c];
        });
    }

    /* esc() neutralises markup but says nothing about the URL scheme, so an
       href of "javascript:..." would still run on click. Anything bound to
       href or src goes through this first; only http(s) is allowed. */
    function safeUrl(u) {
        var s = String(u == null ? '' : u).trim();
        return /^https?:\/\//i.test(s) ? s : '#';
    }

    global.esc = esc;
    global.safeUrl = safeUrl;
})(window);

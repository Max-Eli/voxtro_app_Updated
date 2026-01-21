UPDATE chatbots 
SET embed_code = '<script>
  (function() {
    var script = document.createElement(''script'');
    script.src = ''https://atmwldssfrbmcluvmelm.functions.supabase.co/functions/v1/widget/' || id || '.js'';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>'
WHERE embed_code LIKE '%lovableproject.com%';
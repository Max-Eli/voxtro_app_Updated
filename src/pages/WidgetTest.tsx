import { useEffect, useState } from 'react';

export default function WidgetTest() {
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setResults(prev => [...prev, `${type.toUpperCase()}: ${message}`]);
  };

  useEffect(() => {
    const testWidget = async () => {
      try {
        addResult('Testing widget URL...', 'info');
        const response = await fetch(`https://atmwldssfrbmcluvmelm.functions.supabase.co/functions/v1/widget/c8f37557-83d7-4ab2-9950-1ab9c5c540db.js?test=${Date.now()}`);
        
        addResult(`HTTP Status: ${response.status} ${response.statusText}`, response.ok ? 'success' : 'error');
        addResult(`Content-Type: ${response.headers.get('content-type')}`, 'info');
        
        if (response.ok) {
          const text = await response.text();
          addResult(`Response length: ${text.length} characters`, 'success');
          addResult(`Contains CHATBOT_ID: ${text.includes('CHATBOT_ID') ? 'Yes' : 'No'}`, text.includes('CHATBOT_ID') ? 'success' : 'error');
          
          if (text.includes('console.error')) {
            addResult(`Widget returns error: ${text}`, 'error');
          } else if (text.includes('CHATBOT_ID')) {
            addResult('Widget returns valid JavaScript', 'success');
            
            // Try to load the widget
            setTimeout(() => {
              const script = document.createElement('script');
              script.src = `https://atmwldssfrbmcluvmelm.functions.supabase.co/functions/v1/widget/c8f37557-83d7-4ab2-9950-1ab9c5c540db.js?widget=${Date.now()}`;
              script.onload = () => {
                addResult('Widget script loaded successfully', 'success');
                setTimeout(() => {
                  const widget = document.getElementById('voxtro-widget');
                  addResult(`Widget element in DOM: ${widget ? 'Yes' : 'No'}`, widget ? 'success' : 'error');
                }, 1000);
              };
              script.onerror = () => {
                addResult('Widget script failed to load', 'error');
              };
              document.head.appendChild(script);
            }, 1000);
          }
        } else {
          const errorText = await response.text();
          addResult(`Error response: ${errorText}`, 'error');
        }
      } catch (error) {
        addResult(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      }
    };

    testWidget();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Widget Test</h1>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results:</h2>
          
          <div className="space-y-3">
            {results.map((result, index) => {
              const [type, ...messageParts] = result.split(': ');
              const message = messageParts.join(': ');
              const isError = type === 'ERROR';
              const isSuccess = type === 'SUCCESS';
              
              return (
                <div
                  key={index}
                  className={`p-3 rounded-md ${
                    isError
                      ? 'bg-red-50 border border-red-200 text-red-800'
                      : isSuccess
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-blue-50 border border-blue-200 text-blue-800'
                  }`}
                >
                  <span className="font-semibold">{type}:</span> {message}
                </div>
              );
            })}
          </div>
          
          {results.length === 0 && (
            <div className="text-gray-500 italic">Running tests...</div>
          )}
        </div>
        
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">What to look for:</h3>
          <ul className="text-yellow-700 space-y-1">
            <li>• HTTP Status should be 200 OK</li>
            <li>• Response should contain CHATBOT_ID</li>
            <li>• Widget script should load successfully</li>
            <li>• Widget element should appear in DOM</li>
            <li>• Blue chat button should be visible in bottom-right corner</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
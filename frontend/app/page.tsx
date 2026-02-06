'use client';

import { useState, useEffect } from 'react';
import { apiClient, Item } from '@/lib/api';

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [apiStatus, setApiStatus] = useState<string>('Checking...');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<string>('');

  useEffect(() => {
    checkApiHealth();
    fetchItems();
  }, []);

  const checkApiHealth = async () => {
    try {
      const response = await apiClient.healthCheck();
      setApiStatus(`✓ ${response.message}`);
    } catch (error) {
      setApiStatus('✗ API is not responding');
      console.error('Health check failed:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await apiClient.getItems();
      setItems(response.items);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessItem = async () => {
    setProcessing(true);
    setProcessResult('');
    try {
      const response = await apiClient.processItem({
        name: 'Test Item',
        value: 50,
      });
      setProcessResult(
        `Processed: ${response.name} - Original: 50, Processed: ${response.value}`
      );
    } catch (error) {
      setProcessResult('Failed to process item');
      console.error('Process failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Liquidity Platform
          </h1>
          <p className="text-xl text-gray-300">
            Next.js + FastAPI Boilerplate
          </p>
        </div>

        {/* API Status Card */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">API Status</h2>
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  apiStatus.startsWith('✓')
                    ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                    : 'bg-red-500/20 text-red-300 border border-red-500/50'
                }`}
              >
                {apiStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Items List Card */}
          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 shadow-2xl border border-white/20 hover:border-purple-500/50 transition-all duration-300">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Items from API
            </h2>
            {loading ? (
              <div className="text-gray-300 text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
              </div>
            ) : (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors duration-200 border border-white/10"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">{item.name}</span>
                      <span className="text-purple-400 font-semibold">
                        ${item.value}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Process Item Card */}
          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 shadow-2xl border border-white/20 hover:border-pink-500/50 transition-all duration-300">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Process Item
            </h2>
            <p className="text-gray-300 mb-6">
              Test the API by processing an item. The backend will double the value.
            </p>
            <button
              onClick={handleProcessItem}
              disabled={processing}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {processing ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Process Test Item'
              )}
            </button>
            {processResult && (
              <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                <p className="text-green-300 text-sm">{processResult}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tech Stack Info */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="backdrop-blur-lg bg-white/5 rounded-2xl p-8 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-4">
              Tech Stack
            </h3>
            <div className="grid md:grid-cols-2 gap-6 text-gray-300">
              <div>
                <h4 className="text-purple-400 font-semibold mb-2">Frontend</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Next.js 15 with App Router</li>
                  <li>• TypeScript</li>
                  <li>• Tailwind CSS</li>
                  <li>• React 19</li>
                </ul>
              </div>
              <div>
                <h4 className="text-pink-400 font-semibold mb-2">Backend</h4>
                <ul className="space-y-1 text-sm">
                  <li>• FastAPI</li>
                  <li>• Python 3.8+</li>
                  <li>• Uvicorn</li>
                  <li>• Pydantic</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

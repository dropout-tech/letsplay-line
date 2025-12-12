"use client";

import { useLiff } from "./providers/liff-provider";

export default function Home() {
  const { liff, liffError, isLoading } = useLiff();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Initializing LIFF...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-black dark:text-zinc-50">
            LIFF Chatbot
          </h1>

          {liff && (
            <div className="space-y-4">
              <div className="p-4 bg-green-100 dark:bg-green-900 rounded-lg">
                <p className="text-green-800 dark:text-green-200 font-semibold">
                  ✅ LIFF init succeeded!
                </p>
              </div>

              <div className="space-y-2 text-left bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="font-semibold text-black dark:text-white mb-2">
                  LIFF Info:
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>OS:</strong> {liff.getOS()}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Language:</strong> {liff.getLanguage()}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Version:</strong> {liff.getVersion()}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Is in Client:</strong>{" "}
                  {liff.isInClient() ? "Yes" : "No"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Is Login:</strong> {liff.isLoggedIn() ? "Yes" : "No"}
                </p>
              </div>

              {!liff.isLoggedIn() && (
                <button
                  onClick={() => liff.login()}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Login with LINE
                </button>
              )}

              {liff.isLoggedIn() && (
                <button
                  onClick={() => liff.logout()}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Logout
                </button>
              )}
            </div>
          )}

          {liffError && (
            <div className="space-y-4">
              <div className="p-4 bg-red-100 dark:bg-red-900 rounded-lg">
                <p className="text-red-800 dark:text-red-200 font-semibold mb-2">
                  ❌ LIFF init failed
                </p>
                <code className="text-sm text-red-700 dark:text-red-300 break-all">
                  {liffError}
                </code>
              </div>
            </div>
          )}

          <div className="mt-8 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/activity"
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-center"
              >
                進入聊天室 💬
              </a>
              <a
                href="https://developers.line.biz/ja/docs/liff/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 border border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors text-center"
              >
                LIFF 文檔
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

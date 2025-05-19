import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Code, Zap, BookOpen } from "lucide-react";

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setIsLoading(false);
    navigate("/results", { state: prompt });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12">
      <div className="max-w-3xl w-full space-y-12 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white tracking-tight">
            Create beautiful React websites{" "}
            <span className="text-blue-600 dark:text-blue-400">in seconds</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Describe what you want, and we'll generate a complete React website
            with all the code you need.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the website you want to create..."
              className="w-full px-4 py-3 h-32 text-lg rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white dark:bg-slate-800 dark:text-white dark:placeholder-slate-400 shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className={`px-6 py-3 text-lg font-medium rounded-lg flex items-center justify-center gap-2 transition-all w-full md:w-auto mx-auto ${
              isLoading || !prompt.trim()
                ? "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-md hover:shadow-lg"
            }`}
          >
            {isLoading ? (
              <>
                <span className="animate-pulse">Generating</span>
                <span className="inline-block animate-pulse">.</span>
                <span className="inline-block animate-pulse delay-100">.</span>
                <span className="inline-block animate-pulse delay-200">.</span>
              </>
            ) : (
              <>
                Generate Website <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Zap size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">
              Fast Generation
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Get a complete website in seconds, not hours or days.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Code
                size={24}
                className="text-purple-600 dark:text-purple-400"
              />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">
              Production-Ready
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Clean, well-structured code you can use immediately.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center mb-4 mx-auto">
              <BookOpen
                size={24}
                className="text-teal-600 dark:text-teal-400"
              />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">
              Easily Customizable
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Edit and extend your generated website as needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

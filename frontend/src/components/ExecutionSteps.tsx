import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  ArrowRight,
  FileText,
  Package,
  Terminal,
} from "lucide-react";

interface Step {
  id: number;
  title: string;
  description: string;
  type: "file" | "dependency" | "command";
  icon: React.ReactNode;
  completed: boolean;
  expanded?: boolean;
  code?: string;
}

interface MyProps {
  steps: Step[];
  currentStep: any;
  toggleExpand: any;
  intervalFunc: any;
}

const ExecutionSteps: React.FC<MyProps> = ({
  steps,
  currentStep,
  toggleExpand,
  intervalFunc,
}) => {
  console.log(steps);
  //const [steps, setSteps] = useState<Step[]>(stepsD);

  useEffect(() => {
    // const generatedSteps: Step[] = [
    //   {
    //     id: 1,
    //     title: "Creating project structure",
    //     description: "Setting up the initial project files and directories",
    //     type: "file",
    //     icon: <FileText size={18} />,
    //     completed: false,
    //     code: "Created directories: src, public, components, pages, utils",
    //   },
    //   {
    //     id: 2,
    //     title: "Installing dependencies",
    //     description: "Adding required packages to package.json",
    //     type: "dependency",
    //     icon: <Package size={18} />,
    //     completed: false,
    //     code: "Added: react, react-dom, react-router-dom, tailwindcss",
    //   },
    //   {
    //     id: 3,
    //     title: "Creating components",
    //     description: "Building reusable UI components",
    //     type: "file",
    //     icon: <FileText size={18} />,
    //     completed: false,
    //     code: "Created: Navbar.tsx, Button.tsx, Card.tsx, Footer.tsx",
    //   },
    //   {
    //     id: 4,
    //     title: "Creating pages",
    //     description: "Building page layouts and content",
    //     type: "file",
    //     icon: <FileText size={18} />,
    //     completed: false,
    //     code: "Created: HomePage.tsx, AboutPage.tsx, ContactPage.tsx",
    //   },
    //   {
    //     id: 5,
    //     title: "Setting up routing",
    //     description: "Configuring navigation between pages",
    //     type: "file",
    //     icon: <FileText size={18} />,
    //     completed: false,
    //     code: "Set up React Router in App.tsx with routes for all pages",
    //   },
    //   {
    //     id: 6,
    //     title: "Building project",
    //     description: "Compiling and optimizing for production",
    //     type: "command",
    //     icon: <Terminal size={18} />,
    //     completed: false,
    //     code: "Running build command to generate optimized assets",
    //   },
    // ];
    //setSteps(stepss);

    const interval = setInterval(intervalFunc, 800);

    return () => clearInterval(interval);
  }, []);

  // const toggleExpand = (stepId: number) => {
  //   setSteps(
  //     steps.map((step) =>
  //       step.id === stepId ? { ...step, expanded: !step.expanded } : step
  //     )
  //   );
  // };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
        Execution Steps
      </h2>

      <div className="space-y-3">
        {steps?.map((step, index) => (
          <div
            key={step.id}
            className={`border rounded-lg overflow-hidden transition-all duration-300 ${
              step.completed
                ? "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            }`}
          >
            <div
              className="p-3 flex items-start gap-3 cursor-pointer"
              onClick={() => toggleExpand(step.id)}
            >
              <div
                className={`mt-0.5 flex-shrink-0 ${
                  step.completed
                    ? "text-green-500 dark:text-green-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {step.completed ? <CheckCircle size={18} /> : step?.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3
                    className={`font-medium ${
                      step.completed
                        ? "text-green-800 dark:text-green-300"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {step.title}
                  </h3>

                  {index + 1 === currentStep && !step.completed && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 flex items-center">
                      In progress
                    </span>
                  )}
                </div>

                <p
                  className={`text-sm mt-0.5 ${
                    step.completed
                      ? "text-green-600 dark:text-green-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {step.description}
                </p>
              </div>

              <div className="flex-shrink-0">
                <ArrowRight
                  size={16}
                  className={`transform transition-transform ${
                    step.expanded ? "rotate-90" : ""
                  } ${
                    step.completed
                      ? "text-green-500 dark:text-green-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                />
              </div>
            </div>

            {step.expanded && step.code && (
              <div className="px-3 pb-3 pt-0 ml-6 border-t border-slate-100 dark:border-slate-700">
                <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-2 rounded overflow-x-auto text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {step.code}
                </pre>
              </div>
            )}
          </div>
        ))}

        {currentStep >= steps?.length && (
          <div className="mt-4 p-3 border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-800 dark:text-green-300">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle
                size={18}
                className="text-green-500 dark:text-green-400"
              />
              <span>All steps completed successfully!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionSteps;

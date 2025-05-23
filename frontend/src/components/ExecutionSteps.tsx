import { ExecutionStepsProps } from "../types";
import { CheckCircle, Loader2 } from "lucide-react";

export default function ExecutionSteps({
  steps,
  currentStep,
}: ExecutionStepsProps) {
  return (
    <div className="p-4 overflow-y-auto h-[70vh] hide-scrollbar">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
        Execution Steps
      </h2>

      {steps.length > 0 ? (
        <div className="space-y-3  ">
          {steps?.map((step, index) => (
            <div
              key={step.id}
              className={`border rounded-lg overflow-hidden transition-all duration-300 ${
                step.completed
                  ? "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              }`}
            >
              <div className="p-3 flex items-start gap-3 cursor-pointer">
                <div
                  className={`mt-0.5 flex-shrink-0 ${
                    step.completed
                      ? "text-green-500 dark:text-green-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle size={18} />
                  ) : (
                    <Loader2 className="animate-spin text-green-50" size={18} />
                  )}
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
                      Create {step.title}
                    </h3>

                    {index + 1 === currentStep && !step.completed && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 flex items-center">
                        In progress
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex justify-center">
          <Loader2 className="animate-spin text-blue-200" size={72} />
        </div>
      )}
    </div>
  );
}

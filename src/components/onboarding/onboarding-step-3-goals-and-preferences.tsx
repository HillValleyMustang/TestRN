'use client'

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, X, Bot, Clock, CheckCircle, XCircle } from "lucide-react"; // Added CheckCircle, XCircle

interface OnboardingStep3Props {
  goalFocus: string;
  setGoalFocus: (value: string) => void;
  preferredMuscles: string; // Comma-separated string
  setPreferredMuscles: (value: string) => void;
  constraints: string;
  setConstraints: (value: string) => void;
  sessionLength: string;
  setSessionLength: (value: string) => void;
  handleNext: () => void; // This is the submit action
  handleBack: () => void;
}

export const OnboardingStep3_GoalsAndPreferences = ({
  goalFocus,
  setGoalFocus,
  preferredMuscles,
  setPreferredMuscles,
  constraints,
  setConstraints,
  sessionLength,
  setSessionLength,
  handleNext, // This is the submit action
  handleBack,
}: OnboardingStep3Props) => {
  const [showTyping, setShowTyping] = useState(false);

  // Convert preferredMuscles string to array for multi-select logic
  const selectedMusclesArray = preferredMuscles ? preferredMuscles.split(',').map(m => m.trim()) : [];

  const goals = [
    { id: 'muscle_tone', icon: '💪', text: 'Build Muscle & Tone' },
    { id: 'general_fitness', icon: '🏃', text: 'General Fitness' },
    { id: 'strength', icon: '🏋️', text: 'Build Strength' },
    { id: 'mobility', icon: '🧘', text: 'Mobility' }
  ];

  const muscles = [
    'Arms', 'Chest', 'Legs', 'Core', 'Back', 'Shoulders'
  ];

  const timeOptions = [
    { id: '15-30', label: 'Quick Sessions', desc: 'Short & efficient', fill: 25 },
    { id: '30-45', label: 'Balanced', desc: 'Perfect middle ground', fill: 50 },
    { id: '45-60', label: 'Full Workouts', desc: 'Comprehensive training', fill: 75 },
    { id: '60-90', label: 'Extended', desc: 'Maximum dedication', fill: 100 }
  ];

  const handleGoalSelect = (goalId: string) => {
    setGoalFocus(goalId);
  };

  const handleMuscleToggle = (muscle: string) => {
    const currentSelection = new Set(selectedMusclesArray);
    if (currentSelection.has(muscle)) {
      currentSelection.delete(muscle);
    } else {
      currentSelection.add(muscle);
    }
    setPreferredMuscles(Array.from(currentSelection).join(', '));
  };

  const handleTimeSelect = (timeId: string) => {
    setSessionLength(timeId);
  };

  const isValid = !!goalFocus && !!sessionLength;

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl shadow-lg min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Let's personalise your plan
        </h1>
        <p className="text-sm text-slate-500">Just a few quick questions</p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        
        {/* Question 1: Goals */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-5 leading-tight">
            What's your main fitness goal right now?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {goals.map((goal) => (
              <div
                key={goal.id}
                onClick={() => handleGoalSelect(goal.id)}
                className={cn(
                  `relative bg-white border-2 rounded-2xl cursor-pointer transition-all duration-300`,
                  `flex flex-col items-center justify-center text-center p-5 min-h-20 overflow-hidden`,
                  `hover:border-red-500 hover:-translate-y-0.5 hover:shadow-md`,
                  goalFocus === goal.id 
                    ? 'border-red-500 -translate-y-1 shadow-lg border-[3px]' 
                    : 'border-slate-200'
                )}
              >
                {/* Top border fill animation */}
                <div className={cn(
                  `absolute top-0 left-0 w-full h-1 bg-red-500 transition-transform duration-400 ease-out`,
                  goalFocus === goal.id ? 'translate-x-0' : '-translate-x-full'
                )} />
                
                {/* Icon - only appears when selected */}
                <div className={cn(
                  `text-2xl mb-2 transition-all duration-300 ease-out`,
                  goalFocus === goal.id 
                    ? 'opacity-100 scale-100' 
                    : 'opacity-0 scale-50'
                )}>
                  {goal.icon}
                </div>
                
                <div className="text-sm font-bold leading-tight text-slate-900">
                  {goal.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Question 2: Muscle Focus */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-5 leading-tight">
            Any specific muscle groups you want to focus on?
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {muscles.map((muscle) => (
              <div
                key={muscle}
                onClick={() => handleMuscleToggle(muscle)}
                className={cn(
                  `relative bg-white border-2 border-slate-200 rounded-xl cursor-pointer`,
                  `transition-all duration-300 p-3 text-sm font-medium text-center`,
                  `hover:-translate-y-0.5 overflow-hidden`,
                  selectedMusclesArray.includes(muscle) 
                    ? 'text-red-500 font-semibold -translate-y-0.5' 
                    : 'text-slate-600'
                )}
              >
                {/* Animated red border overlay */}
                <div className={`
                  absolute inset-0 border-[3px] border-red-500 rounded-xl pointer-events-none
                  transition-all duration-400 ease-out
                  ${selectedMusclesArray.includes(muscle)
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-75'
                  }
                `} style={{
                  transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                }} />
                
                <div className="relative z-10">{muscle}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-slate-500 italic mt-2">
            This helps our AI tailor exercise suggestions
          </div>
          <div className="text-xs text-slate-500 italic text-center mt-3">
            You can change this later in your Profile
          </div>
        </div>

        {/* Question 3: Time */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-5 leading-tight">
            How much time do you usually have for workouts?
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-5">
            {timeOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => handleTimeSelect(option.id)}
                className={cn(
                  `relative bg-white border-2 rounded-2xl cursor-pointer transition-all duration-300`,
                  `p-5 text-center overflow-hidden`,
                  `hover:border-red-500 hover:-translate-y-0.5 hover:shadow-md`,
                  sessionLength === option.id 
                    ? 'border-red-500 -translate-y-1 shadow-lg border-[3px]' 
                    : 'border-slate-200'
                )}
              >
                {/* Background fill */}
                <div className={cn(
                  `absolute bottom-0 left-0 w-full transition-all duration-400 ease-out`,
                  sessionLength === option.id 
                    ? 'h-full bg-gradient-to-t from-red-500/80 to-red-500/90' 
                    : 'h-0 bg-gradient-to-t from-red-500/10 to-red-500/20'
                )} />
                
                {/* Clock Visual */}
                <div className="relative z-10 mb-3">
                  <div className="w-15 h-15 mx-auto mb-3 relative flex items-center justify-center">
                    <div className={cn(
                      `w-full h-full border-[3px] rounded-full relative transition-all duration-300`,
                      sessionLength === option.id 
                        ? 'border-red-500' 
                        : 'border-slate-200'
                    )}>
                      {/* Progress fill */}
                      <div 
                        className={cn(
                          `absolute -top-[3px] -left-[3px] -right-[3px] -bottom-[3px] rounded-full`,
                          `transition-opacity duration-300`,
                          sessionLength === option.id ? 'opacity-100' : 'opacity-0'
                        )}
                        style={{
                          background: `conic-gradient(from 0deg, #ef4444 0%, #ef4444 ${option.fill}%, transparent ${option.fill}%)`
                        }}
                      />
                    </div>
                    
                    {/* Time text */}
                    <div className={cn(
                      `absolute text-xs font-bold transition-colors duration-300`,
                      sessionLength === option.id ? 'text-white' : 'text-slate-500'
                    )}>
                      {option.id}
                    </div>
                  </div>
                </div>
                
                <div className={cn(
                  `relative z-10 text-sm font-semibold mb-1 transition-colors duration-300`,
                  sessionLength === option.id ? 'text-white' : 'text-slate-900'
                )}>
                  {option.label}
                </div>
                <div className={cn(
                  `relative z-10 text-xs font-medium transition-colors duration-300`,
                  sessionLength === option.id ? 'text-white' : 'text-slate-500'
                )}>
                  {option.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Question 4: Constraints */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-5 leading-tight">
            Anything I should know about? Injuries, limitations, etc.
          </h2>
          <textarea
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm text-slate-600 
                       transition-all duration-200 outline-none resize-none
                       focus:border-red-500 focus:bg-red-50/50"
            placeholder="Type here or leave blank if nothing comes to mind..."
            rows={3}
          />
          <div className="text-xs text-slate-500 italic mt-2">
            This helps me keep your workouts safe and effective
          </div>
        </div>

        {/* Typing Indicator */}
        {showTyping && (
          <div className="flex items-center gap-1 text-slate-500 text-sm mb-4">
            <span>AI is thinking</span>
            <div className="flex gap-0.5">
              {[0, 0.2, 0.4].map((delay, i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-slate-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}s`, animationDuration: '1.5s' }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="p-6 border-t border-slate-100 flex gap-3">
        <button 
          onClick={handleBack}
          className="flex-1 h-12 bg-slate-50 text-slate-600 border border-slate-200 
                           rounded-xl font-semibold transition-colors duration-200
                           hover:bg-slate-100"
        >
          Back
        </button>
        <button 
          onClick={handleNext} // Call the handleNext prop for submission
          onMouseEnter={() => setShowTyping(true)}
          onMouseLeave={() => setShowTyping(false)}
          disabled={!isValid}
          className={cn(
            `flex-1 h-12 bg-gradient-to-r from-red-500 to-red-600 text-white`, 
            `rounded-xl font-semibold transition-all duration-200`,
            `hover:-translate-y-0.5 hover:shadow-md`,
            `disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:transform-none disabled:hover:shadow-none disabled:cursor-not-allowed`
          )}
        >
          Create My Plan
        </button>
      </div>
    </div>
  );
};
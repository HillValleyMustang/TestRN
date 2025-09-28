'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { z } from 'zod'

// Zod Schema
export const onboardingStep1Schema = z.object({
  fullName: z.string().min(1, "Your name is required."),
  heightCm: z.number().int().positive().min(100).max(250),
  weight: z.number().int().positive().min(30).max(150), // Adjusted max weight to 150kg
  bodyFatPct: z.number().int().min(5).max(50).nullable(),
  heightUnit: z.enum(['cm', 'ft']),
  weightUnit: z.enum(['kg', 'lbs'])
})

export type FormData = z.infer<typeof onboardingStep1Schema>

// New type for state to allow null for weight, which is required for validation but can be empty in the input
type FormState = Omit<FormData, 'weight'> & {
  weight: number | null;
  heightFt: number;
  heightIn: number;
}

interface OnboardingStep1Props {
  onNext: (data: FormData) => void
  onBack?: () => void
  className?: string
}

const OnboardingStep1: React.FC<OnboardingStep1Props> = ({ onNext, onBack, className }) => {
  const [formData, setFormData] = useState<FormState>({
    fullName: '',
    heightCm: 175,
    heightFt: 5,
    heightIn: 9,
    weight: null, // Start empty
    bodyFatPct: null,
    heightUnit: 'ft',
    weightUnit: 'kg'
  })

  const [activeSlider, setActiveSlider] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Form validation
  useEffect(() => {
    try {
      onboardingStep1Schema.parse(formData)
      setIsValid(true)
      setErrors({})
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(fieldErrors)
      }
      setIsValid(false)
    }
  }, [formData])

  // Conversion functions
  const convertCmToFtIn = (cm: number) => {
    const totalInches = cm / 2.54
    const feet = Math.floor(totalInches / 12)
    const inches = Math.round(totalInches % 12)
    return { feet, inches }
  }

  const convertFtInToCm = (feet: number, inches: number) => {
    return Math.round((feet * 12 + inches) * 2.54)
  }

  const convertKgToLbs = (kg: number) => Math.round(kg * 2.205)
  const convertLbsToKg = (lbs: number) => Math.round(lbs / 2.205)
  const convertKgToStLbs = (kg: number) => {
    const totalLbs = kg * 2.20462;
    const stone = Math.floor(totalLbs / 14);
    const pounds = Math.round(totalLbs % 14);
    return { stone, pounds };
  }

  // Handlers
  const handleHeightCmChange = (value: number) => {
    const { feet, inches } = convertCmToFtIn(value)
    setFormData(prev => ({
      ...prev,
      heightCm: value,
      heightFt: feet,
      heightIn: inches
    }))
  }

  const handleHeightFtInChange = (feet: number, inches: number) => {
    const cm = convertFtInToCm(feet, inches)
    setFormData(prev => ({
      ...prev,
      heightCm: cm,
      heightFt: feet,
      heightIn: inches
    }))
  }

  const handleWeightChange = (value: string) => {
    const num = parseInt(value, 10);
    setFormData(prev => ({ ...prev, weight: isNaN(num) ? null : num }))
  }

  const handleHeightUnitChange = (unit: 'cm' | 'ft') => {
    setFormData(prev => ({ ...prev, heightUnit: unit }))
  }

  const handleWeightUnitChange = (unit: 'kg' | 'lbs') => {
    const currentWeight = formData.weight
    let newWeight = currentWeight
    
    if (currentWeight !== null) {
      if (unit === 'lbs' && formData.weightUnit === 'kg') {
        newWeight = convertKgToLbs(currentWeight)
      } else if (unit === 'kg' && formData.weightUnit === 'lbs') {
        newWeight = convertLbsToKg(currentWeight)
      }
    }
    
    setFormData(prev => ({ 
      ...prev, 
      weightUnit: unit,
      weight: newWeight
    }))
  }

  const getBodyFatCategory = (percentage: number): string => {
    if (percentage < 10) return "Essential fat"
    if (percentage < 15) return "Athletic"
    if (percentage < 20) return "Fitness"
    if (percentage < 25) return "Average"
    return "Average+"
  }

  const getSliderProgress = (value: number, min: number, max: number): number => {
    return ((value - min) / (max - min)) * 100
  }

  const handleSubmit = () => {
    setTouched({ fullName: true, heightCm: true, weight: true, bodyFatPct: true });
    if (isValid) {
      const submissionData = {
        ...formData,
        weight: formData.weightUnit === 'lbs' ? convertLbsToKg(formData.weight!) : formData.weight!
      }
      onNext(submissionData)
    }
  }

  const handleTouch = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  return (
    <div className={cn("max-w-md mx-auto p-6 space-y-8 bg-white", className)}>
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">
          Welcome to Your Fitness Journey
        </h1>
        <p className="text-gray-600 text-base">
          Let's set up your personalised Transformation Path
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-full bg-onboarding-primary text-white flex items-center justify-center font-semibold text-lg shadow-lg transition-all duration-300">
            1
          </div>
          <div className="w-6 h-1 bg-gray-200 rounded-full"></div>
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-semibold border border-gray-300">
            2
          </div>
          <div className="w-6 h-1 bg-gray-200 rounded-full"></div>
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-semibold border border-gray-300">
            3
          </div>
          <div className="w-6 h-1 bg-gray-200 rounded-full"></div>
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-semibold border border-gray-300">
            4
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-base font-semibold text-gray-900">
            What should we call you?
          </Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Enter your name"
            value={formData.fullName}
            onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
            onBlur={() => handleTouch('fullName')}
            className={cn(
              "h-12 px-4 text-base border-2 rounded-xl transition-all duration-200",
              "focus:ring-2 focus:ring-onboarding-primary/20 focus:border-onboarding-primary",
              "hover:border-gray-400",
              errors.fullName && touched.fullName ? "border-red-500" : "border-gray-300"
            )}
          />
          {errors.fullName && touched.fullName && (
            <p className="text-sm text-red-500">{errors.fullName}</p>
          )}
        </div>

        {/* Height Field */}
        <div className="space-y-2">
          <Label className="text-base font-semibold text-gray-900">How tall are you?</Label>
          <div className="relative">
            {formData.heightUnit === 'cm' ? (
              <Input
                type="number"
                inputMode="numeric"
                placeholder="" // Removed placeholder
                value={formData.heightCm}
                onChange={(e) => handleHeightCmChange(Number(e.target.value))}
                onFocus={() => setActiveSlider('height')}
                className={cn(
                  "h-12 px-4 pr-20 text-base border-2 rounded-xl transition-all duration-200",
                  "focus:ring-2 focus:ring-onboarding-primary/20 focus:border-onboarding-primary",
                  "hover:border-gray-400",
                  activeSlider === 'height' ? "border-onboarding-primary bg-onboarding-primary-faint" : "border-gray-300"
                )}
              />
            ) : (
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="" // Removed placeholder
                  value={formData.heightFt}
                  onChange={(e) => handleHeightFtInChange(Number(e.target.value), formData.heightIn)}
                  onFocus={() => setActiveSlider('height')}
                  className={cn(
                    "h-12 px-3 text-base border-2 rounded-xl transition-all duration-200 w-20 text-center",
                    "focus:ring-2 focus:ring-onboarding-primary/20 focus:border-onboarding-primary",
                    activeSlider === 'height' ? "border-onboarding-primary bg-onboarding-primary-faint" : "border-gray-300"
                  )}
                />
                <span className="text-gray-600 font-medium">ft</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="" // Removed placeholder
                  value={formData.heightIn}
                  onChange={(e) => handleHeightFtInChange(formData.heightFt, Number(e.target.value))}
                  onFocus={() => setActiveSlider('height')}
                  className={cn(
                    "h-12 px-3 text-base border-2 rounded-xl transition-all duration-200 w-20 text-center",
                    "focus:ring-2 focus:ring-onboarding-primary/20 focus:border-onboarding-primary",
                    activeSlider === 'height' ? "border-onboarding-primary bg-onboarding-primary-faint" : "border-gray-300"
                  )}
                />
                <span className="text-gray-600 font-medium">in</span>
              </div>
            )}
            
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-1">
              <Button type="button" variant="outline" size="sm" className={cn("h-7 px-2 text-xs font-medium border transition-all duration-200", formData.heightUnit === 'ft' ? "bg-onboarding-primary text-white border-onboarding-primary shadow-sm" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400")} onClick={() => handleHeightUnitChange('ft')}>ft</Button>
              <Button type="button" variant="outline" size="sm" className={cn("h-7 px-2 text-xs font-medium border transition-all duration-200", formData.heightUnit === 'cm' ? "bg-onboarding-primary text-white border-onboarding-primary shadow-sm" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400")} onClick={() => handleHeightUnitChange('cm')}>cm</Button>
            </div>
          </div>

          {activeSlider === 'height' && (
            <div className="mt-4 p-5 bg-onboarding-primary-faint border-2 border-onboarding-primary rounded-xl shadow-lg animate-in slide-in-from-top-2 duration-300">
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-onboarding-primary">{formData.heightCm} cm</div>
                <div className="text-sm text-gray-600">{formData.heightFt} ft {formData.heightIn} in</div>
              </div>
              <div className="relative h-8 flex items-center">
                <div className="relative w-full h-2 bg-gray-200 rounded-full">
                  <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-onboarding-primary to-onboarding-primary-light rounded-full" style={{ width: `${getSliderProgress(formData.heightCm, 100, 250)}%` }} />
                  <div className="absolute top-1/2 w-8 h-8 rounded-full shadow-lg transform -translate-y-1/2 -translate-x-1/2 border-4 border-white cursor-pointer transition-transform duration-200 hover:scale-110" style={{ left: `${getSliderProgress(formData.heightCm, 100, 250)}%`, backgroundImage: 'radial-gradient(circle at 30% 30%, hsl(var(--onboarding-primary-light)), hsl(var(--onboarding-primary)))' }} />
                </div>
                <input type="range" min="100" max="250" value={formData.heightCm} onChange={(e) => handleHeightCmChange(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>100 cm</span>
                <span>250 cm</span>
              </div>
            </div>
          )}
          {errors.heightCm && touched.heightCm && <p className="text-sm text-red-500">{errors.heightCm}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-base font-semibold text-gray-900">Current weight?</Label>
            <div className="relative">
              <Input type="number" inputMode="numeric" placeholder="" value={formData.weight ?? ''} onChange={(e) => handleWeightChange(e.target.value)} onFocus={() => setActiveSlider('weight')} onBlur={() => { handleTouch('weight'); setActiveSlider(null); }} className={cn("h-12 px-4 pr-16 text-base border-2 rounded-xl transition-all duration-200", "focus:ring-2 focus:ring-onboarding-primary/20 focus:border-onboarding-primary", "hover:border-gray-400", activeSlider === 'weight' ? "border-onboarding-primary bg-onboarding-primary-faint" : "border-gray-300")} />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                <Button type="button" variant="outline" size="sm" className={cn("h-7 px-2 text-xs font-medium border transition-all duration-200", formData.weightUnit === 'kg' ? "bg-onboarding-primary text-white border-onboarding-primary shadow-sm" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400")} onClick={() => handleWeightUnitChange('kg')}>kg</Button>
                <Button type="button" variant="outline" size="sm" className={cn("h-7 px-2 text-xs font-medium border transition-all duration-200", formData.weightUnit === 'lbs' ? "bg-onboarding-primary text-white border-onboarding-primary shadow-sm" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400")} onClick={() => handleWeightUnitChange('lbs')}>lbs</Button>
              </div>
            </div>
            {activeSlider === 'weight' && (
              <div className="mt-4 p-5 bg-onboarding-primary-faint border-2 border-onboarding-primary rounded-xl shadow-lg animate-in slide-in-from-top-2 duration-300">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-onboarding-primary">{formData.weight || 0} {formData.weightUnit}</div>
                  <div className="text-sm text-gray-600">
                    {formData.weightUnit === 'kg' ? `${convertKgToLbs(formData.weight || 0)} lbs` : `${convertLbsToKg(formData.weight || 0)} kg`} / {convertKgToStLbs(formData.weightUnit === 'kg' ? (formData.weight || 0) : convertLbsToKg(formData.weight || 0)).stone}st {convertKgToStLbs(formData.weightUnit === 'kg' ? (formData.weight || 0) : convertLbsToKg(formData.weight || 0)).pounds}lbs
                  </div>
                </div>
                <div className="relative h-8 flex items-center">
                  <div className="relative w-full h-2 bg-gray-200 rounded-full">
                    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-onboarding-primary to-onboarding-primary-light rounded-full" style={{ width: `${getSliderProgress(formData.weight || 0, formData.weightUnit === 'kg' ? 30 : 66, formData.weightUnit === 'kg' ? 150 : 330)}%` }} /> {/* Adjusted max to 150kg/330lbs */}
                    <div className="absolute top-1/2 w-8 h-8 rounded-full shadow-lg transform -translate-y-1/2 -translate-x-1/2 border-4 border-white cursor-pointer transition-transform duration-200 hover:scale-110" style={{ left: `${getSliderProgress(formData.weight || 0, formData.weightUnit === 'kg' ? 30 : 66, formData.weightUnit === 'kg' ? 150 : 330)}%`, backgroundImage: 'radial-gradient(circle at 30% 30%, hsl(var(--onboarding-primary-light)), hsl(var(--onboarding-primary)))' }} />
                  </div>
                  <input type="range" min={formData.weightUnit === 'kg' ? 30 : 66} max={formData.weightUnit === 'kg' ? 150 : 330} value={formData.weight || 0} onChange={(e) => handleWeightChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>{formData.weightUnit === 'kg' ? '30 kg' : '66 lbs'}</span>
                  <span>{formData.weightUnit === 'kg' ? '150 kg' : '330 lbs'}</span> {/* Adjusted max to 150kg/330lbs */}
                </div>
              </div>
            )}
            {errors.weight && touched.weight && <p className="text-sm text-red-500">{errors.weight}</p>}
          </div>

          <div className="space-y-2" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { setActiveSlider(null); }}}>
            <Label className="text-base font-semibold text-gray-900">Body fat %<span className="text-sm font-normal text-gray-500 ml-1">(optional)</span><span className="inline-flex items-center justify-center w-4 h-4 ml-1 text-xs text-white bg-onboarding-primary rounded-full cursor-help" title="If you don't know, you can skip this">i</span></Label>
            <Input type="number" inputMode="numeric" placeholder="" value={formData.bodyFatPct || ''} onChange={(e) => setFormData(prev => ({ ...prev, bodyFatPct: e.target.value ? Number(e.target.value) : null }))} onFocus={() => setActiveSlider('bodyFat')} onBlur={() => handleTouch('bodyFatPct')} className={cn("h-12 px-4 text-base border-2 rounded-xl transition-all duration-200", "focus:ring-2 focus:ring-onboarding-primary/20 focus:border-onboarding-primary", "hover:border-gray-400", activeSlider === 'bodyFat' ? "border-onboarding-primary bg-onboarding-primary-faint" : "border-gray-300")} />
            {activeSlider === 'bodyFat' && ( // Always show slider if activeSlider is 'bodyFat'
              <div className="mt-4 p-5 bg-onboarding-primary-faint border-2 border-onboarding-primary rounded-xl shadow-lg animate-in slide-in-from-top-2 duration-300">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-onboarding-primary">{formData.bodyFatPct || 15}%</div>
                  <div className="text-sm text-gray-600">{getBodyFatCategory(formData.bodyFatPct || 15)}</div>
                </div>
                <div className="relative h-8 flex items-center">
                  <div className="relative w-full h-2 bg-gray-200 rounded-full">
                    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-onboarding-primary to-onboarding-primary-light rounded-full" style={{ width: `${getSliderProgress(formData.bodyFatPct || 15, 5, 50)}%` }} />
                    <div className="absolute top-1/2 w-8 h-8 rounded-full shadow-lg transform -translate-y-1/2 -translate-x-1/2 border-4 border-white cursor-pointer transition-transform duration-200 hover:scale-110" style={{ left: `${getSliderProgress(formData.bodyFatPct || 15, 5, 50)}%`, backgroundImage: 'radial-gradient(circle at 30% 30%, hsl(var(--onboarding-primary-light)), hsl(var(--onboarding-primary)))' }} />
                  </div>
                  <input type="range" min="5" max="50" value={formData.bodyFatPct || 15} onChange={(e) => setFormData(prev => ({ ...prev, bodyFatPct: Number(e.target.value) }))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>5%</span>
                  <span>50%</span>
                </div>
              </div>
            )}
            {errors.bodyFatPct && touched.bodyFatPct && <p className="text-sm text-red-500">{errors.bodyFatPct}</p>}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-8">
        <Button onClick={handleSubmit} disabled={!isValid} className={cn("flex-1 h-12 text-base font-semibold transition-all duration-200", "bg-gradient-to-r from-onboarding-primary to-onboarding-primary-light hover:from-onboarding-primary-light hover:to-onboarding-primary", "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0", "disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:transform-none disabled:hover:shadow-none disabled:cursor-not-allowed")}>Next</Button>
      </div>
    </div>
  )
}

export default OnboardingStep1
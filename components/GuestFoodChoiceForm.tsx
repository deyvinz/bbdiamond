'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form'

interface GuestFoodChoiceFormProps {
  guestIndex: number
  isPrimary: boolean
  primaryGuestName?: string
  foodChoices: Array<{ id: string; name: string; description?: string }>
  register: UseFormRegister<any>
  setValue: UseFormSetValue<any>
  watch: UseFormWatch<any>
  errors: FieldErrors<any>
  foodChoicesRequired?: boolean
}

export default function GuestFoodChoiceForm({
  guestIndex,
  isPrimary,
  primaryGuestName,
  foodChoices,
  register,
  setValue,
  watch,
  errors,
  foodChoicesRequired = false,
}: GuestFoodChoiceFormProps) {
  const guestNameField = `guests.${guestIndex - 1}.name` as const
  const foodChoiceField = `guests.${guestIndex - 1}.food_choice` as const
  const guestName = watch(guestNameField)
  const foodChoice = watch(foodChoiceField)

  return (
    <div className="space-y-3 p-4 border border-gray-200 rounded-xl bg-gray-50">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="font-semibold text-gray-900">
          {isPrimary ? 'Primary Guest' : `Guest ${guestIndex}`}
        </h4>
      </div>

      {/* Guest Name */}
      {!isPrimary && (
        <div className="space-y-2">
          <Label htmlFor={guestNameField}>
            Guest Name (Optional)
          </Label>
          <Input
            id={guestNameField}
            type="text"
            placeholder="Enter guest name"
            className="rounded-xl"
            {...register(guestNameField, {
              maxLength: {
                value: 255,
                message: 'Guest name must be less than 255 characters'
              }
            })}
          />
          {errors.guests && Array.isArray(errors.guests) && errors.guests[guestIndex - 1]?.name && (
            <p className="text-sm text-red-600">
              {errors.guests[guestIndex - 1]?.name?.message}
            </p>
          )}
        </div>
      )}

      {isPrimary && primaryGuestName && (
        <div className="space-y-2">
          <Label>Guest Name</Label>
          <div className="text-sm text-gray-700 font-medium p-2 bg-white border border-gray-200 rounded-xl">
            {primaryGuestName}
          </div>
        </div>
      )}

      {/* Food Choice */}
      <div className="space-y-2">
        <Label htmlFor={foodChoiceField}>
          Meal Selection
          {foodChoicesRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {foodChoices.length > 0 ? (
          <Select
            value={foodChoice || ''}
            onValueChange={(value) => {
              setValue(foodChoiceField, value, { shouldValidate: true })
            }}
          >
            <SelectTrigger
              id={foodChoiceField}
              className={errors.guests && Array.isArray(errors.guests) && errors.guests[guestIndex - 1]?.food_choice ? 'border-red-500 rounded-xl' : 'rounded-xl'}
            >
              <SelectValue placeholder="Select meal preference" />
            </SelectTrigger>
            <SelectContent>
              {foodChoices.map((choice) => (
                <SelectItem key={choice.id} value={choice.name}>
                  {choice.name}
                  {choice.description && ` - ${choice.description}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={foodChoiceField}
            type="text"
            placeholder="Enter meal preference"
            className={errors.guests && Array.isArray(errors.guests) && errors.guests[guestIndex - 1]?.food_choice ? 'border-red-500 rounded-xl' : 'rounded-xl'}
            {...register(foodChoiceField, {
              required: foodChoicesRequired ? 'Please select or enter meal preference' : false,
              maxLength: {
                value: 100,
                message: 'Food choice must be less than 100 characters'
              }
            })}
          />
        )}
        <input
          type="hidden"
          {...register(foodChoiceField, {
            required: foodChoicesRequired ? 'Please select or enter meal preference' : false,
            maxLength: {
              value: 100,
              message: 'Food choice must be less than 100 characters'
            }
          })}
        />
        {errors.guests && Array.isArray(errors.guests) && errors.guests[guestIndex - 1]?.food_choice && (
          <p className="text-sm text-red-600">
            {errors.guests[guestIndex - 1]?.food_choice?.message}
          </p>
        )}
        {foodChoices.length > 0 && (
          <p className="text-xs text-gray-500">Select a meal option from the list</p>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import type React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { iconMap, renderIcon } from '@/lib/icon-utils'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface IconPickerProps {
  value?: string
  onChange: (iconName: string | undefined) => void
}

interface IconCategory {
  name: string
  icons: string[]
}

const iconCategories: IconCategory[] = [
  {
    name: 'Religious & Cultural',
    icons: ['Church', 'Cross', 'Circle', 'Star', 'Sparkles', 'Sun', 'Moon', 'SunMoon', 'Compass'],
  },
  {
    name: 'Celebration',
    icons: ['Heart', 'PartyPopper', 'Gift', 'Cake', 'Wine', 'Sparkles', 'Star'],
  },
  {
    name: 'Food & Dining',
    icons: ['UtensilsCrossed', 'Cake', 'Wine'],
  },
  {
    name: 'Activities',
    icons: ['Music', 'Camera', 'Users', 'Gift', 'PartyPopper'],
  },
  {
    name: 'Location & Venue',
    icons: ['MapPin', 'Building2', 'Church', 'Compass'],
  },
  {
    name: 'Nature & Environment',
    icons: ['Flower', 'TreePine', 'Palmtree', 'Waves', 'Sun', 'Moon'],
  },
  {
    name: 'Time & Schedule',
    icons: ['Calendar', 'Clock'],
  },
]

export default function IconPicker({ value, onChange }: IconPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Filter icons based on search query
  const filteredCategories = iconCategories.map(category => {
    if (searchQuery) {
      const filteredIcons = category.icons.filter(iconName =>
        iconName.toLowerCase().includes(searchQuery.toLowerCase())
      )
      return { ...category, icons: filteredIcons }
    }
    if (selectedCategory && selectedCategory !== category.name) {
      return { ...category, icons: [] }
    }
    return category
  }).filter(category => category.icons.length > 0)

  // If no category selected and no search, show all
  const displayCategories = selectedCategory || searchQuery
    ? filteredCategories
    : iconCategories

  const handleIconSelect = (iconName: string) => {
    if (value === iconName) {
      onChange(undefined) // Deselect if clicking the same icon
    } else {
      onChange(iconName)
    }
  }

  const clearSelection = () => {
    onChange(undefined)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Event Icon (Optional)</Label>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Select an icon to represent this event. Icons appear in event listings.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search icons..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setSelectedCategory(null)
          }}
          className="pl-9"
        />
      </div>

      {/* Category filters */}
      {!searchQuery && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="h-8 text-xs"
          >
            All Icons
          </Button>
          {iconCategories.map((category) => (
            <Button
              key={category.name}
              type="button"
              variant={selectedCategory === category.name ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.name)}
              className="h-8 text-xs"
            >
              {category.name}
            </Button>
          ))}
        </div>
      )}

      {/* Icon grid */}
      <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto">
        {displayCategories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No icons found matching "{searchQuery}"</p>
          </div>
        ) : (
          displayCategories.map((category) => (
            <div key={category.name} className="mb-6 last:mb-0">
              <h4 className="text-sm font-medium text-foreground mb-3">
                {category.name}
              </h4>
              <div className="grid grid-cols-8 gap-2">
                {category.icons.map((iconName) => {
                  const IconComponent = iconMap[iconName]
                  if (!IconComponent) return null

                  const isSelected = value === iconName

                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => handleIconSelect(iconName)}
                      className={`
                        relative p-3 rounded-lg border-2 transition-all
                        hover:bg-accent hover:border-accent-foreground
                        flex items-center justify-center
                        ${isSelected 
                          ? 'ring-2 ring-offset-2' 
                          : 'border-border'
                        }
                      `}
                      style={isSelected ? {
                        borderColor: 'var(--color-primary, #C8A951)',
                        backgroundColor: 'var(--color-gold-50, #FFF8E6)',
                        '--tw-ring-color': 'var(--color-primary, #C8A951)',
                      } as React.CSSProperties : {}}
                      title={iconName}
                    >
                      <IconComponent 
                        className="h-5 w-5" 
                        style={{ color: isSelected ? 'var(--color-gold-700, #8C6E2C)' : 'var(--color-foreground, #1E1E1E)' }}
                      />
                      {isSelected && (
                        <div 
                          className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: 'var(--color-primary, #C8A951)' }}
                        >
                          <div className="h-2 w-2 bg-white rounded-full" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected icon preview */}
      {value && (
        <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
          <span className="text-sm font-medium">Selected:</span>
          <div className="flex items-center gap-2">
            {renderIcon(value, 'h-5 w-5', 'var(--color-primary, #C8A951)') || null}
            <span className="text-sm">{value}</span>
          </div>
        </div>
      )}
    </div>
  )
}


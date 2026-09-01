/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/
import { Download } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { exportRedemptions } from '../api'
import { getRedemptionStatusOptions } from '../constants'
import { useRedemptions } from './redemptions-provider'

const EXPORT_FORM_ID = 'redemption-export-form'
const ALL_STATUSES_VALUE = 'all'

export function RedemptionsExportDialog() {
  const { t } = useTranslation()
  const { open, setOpen } = useRedemptions()
  const [name, setName] = useState('')
  const [status, setStatus] = useState(ALL_STATUSES_VALUE)
  const [isExporting, setIsExporting] = useState(false)
  const statusOptions = getRedemptionStatusOptions(t)

  const resetFilters = () => {
    setName('')
    setStatus(ALL_STATUSES_VALUE)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen || isExporting) return
    resetFilters()
    setOpen(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsExporting(true)
    try {
      const blob = await exportRedemptions({
        name: name.trim(),
        status: status === ALL_STATUSES_VALUE ? '' : status,
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `redemption-codes-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      toast.success(t('Redemption codes exported successfully'))
      resetFilters()
      setOpen(null)
    } catch {
      toast.error(t('An unexpected error occurred'))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog
      open={open === 'export'}
      onOpenChange={handleOpenChange}
      title={t('Export Redemption Codes')}
      description={t(
        'Select optional filters before exporting redemption codes.'
      )}
      contentClassName='sm:max-w-lg'
      footer={
        <>
          <Button
            type='button'
            variant='outline'
            onClick={() => setOpen(null)}
            disabled={isExporting}
          >
            {t('Cancel')}
          </Button>
          <Button type='submit' form={EXPORT_FORM_ID} disabled={isExporting}>
            <Download className='h-4 w-4' />
            {isExporting ? t('Exporting...') : t('Export CSV')}
          </Button>
        </>
      }
    >
      <form
        id={EXPORT_FORM_ID}
        onSubmit={handleSubmit}
        className='grid gap-4 py-2'
        aria-busy={isExporting}
      >
        <div className='grid gap-2'>
          <Label htmlFor='redemption-export-name'>{t('Name contains')}</Label>
          <Input
            id='redemption-export-name'
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('Enter a name')}
            disabled={isExporting}
          />
        </div>

        <div className='grid gap-2'>
          <Label htmlFor='redemption-export-status'>{t('Status')}</Label>
          <Select
            value={status}
            onValueChange={(value) => value !== null && setStatus(value)}
            disabled={isExporting}
          >
            <SelectTrigger id='redemption-export-status' className='w-full'>
              <SelectValue>
                {status === ALL_STATUSES_VALUE
                  ? t('All statuses')
                  : statusOptions.find((option) => option.value === status)
                      ?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                <SelectItem value={ALL_STATUSES_VALUE}>
                  {t('All statuses')}
                </SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </form>
    </Dialog>
  )
}

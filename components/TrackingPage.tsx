'use client';
import React from 'react';
import { ChevronDown, Package, MapPin, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { useTranslation } from '@/lib/TranslationContext';

interface TrackingPageProps {
  onPayNow: () => void;
  locationName: string;
  country?: string;
  city?: string;
  onLogoClick: () => void;
}

export const TrackingPage: React.FC<TrackingPageProps> = ({
  onPayNow,
  locationName,
  country = 'Unknown',
  city = 'Unknown',
  onLogoClick,
}) => {
  const { t } = useTranslation();
  const orderNumber = '3062801646906014';
  const originCountry = 'China';
  const destinationCountry = country;
  const destinationCity = city;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center max-w-md mx-auto relative shadow-xl">
      {/* Header */}
      <header className="w-full flex items-center justify-between p-4 border-b border-gray-100">
        <div className="w-8" />
        <div className="flex-1 flex justify-center" onClick={onLogoClick}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/AliExpress_2024.svg/330px-AliExpress_2024.svg.png"
            alt="AliExpress"
            className="h-6 object-contain cursor-pointer"
          />
        </div>
        <div className="w-8" />
      </header>

      {/* Main Content */}
      <div className="w-full px-6 pt-8 pb-4 flex-1 overflow-y-auto">
        {/* Order Info Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#191919] mb-2">Package Tracking</h2>
          <p className="text-sm text-gray-500">Order #{orderNumber}</p>
        </div>

        {/* Tracking Status Card */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Shipping Status</p>
              <p className="text-lg font-bold text-[#191919]">In Transit</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-orange-700">
            <Clock className="w-4 h-4" />
            <span>Expected delivery in 5-7 business days</span>
          </div>
        </div>

        {/* Route Information */}
        <div className="space-y-6 mb-8">
          {/* Origin */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div className="w-0.5 h-16 bg-gradient-to-b from-green-300 to-orange-300" />
            </div>
            <div className="pt-2 pb-8">
              <p className="text-xs text-gray-500 uppercase font-semibold">Origin</p>
              <p className="text-base font-bold text-[#191919]">{originCountry}</p>
              <p className="text-sm text-gray-600">Shipped on {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>

          {/* Destination */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="pt-2">
              <p className="text-xs text-gray-500 uppercase font-semibold">Destination</p>
              <p className="text-base font-bold text-[#191919]">{destinationCountry}</p>
              <p className="text-sm text-gray-600">{destinationCity}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-gray-50 rounded-xl p-4 mb-8 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">Shipped from warehouse</span>
            <span className="text-xs text-gray-500">{new Date().toLocaleDateString()}</span>
          </div>
          <div className="h-0.5 bg-gradient-to-r from-green-400 to-orange-400" />
          <div className="flex items-center justify-between opacity-60">
            <span className="text-sm text-gray-600">In transit to your country</span>
            <span className="text-xs text-gray-500">Expected</span>
          </div>
        </div>

        {/* Security & Delivery Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-1">Buyer Protection</p>
            <p className="text-xs text-blue-700">Your order is protected until delivery is confirmed</p>
          </div>
        </div>

        {/* Delivery Fee Notice */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3 mb-8">
          <span className="text-orange-500 text-xl leading-none mt-0.5">🚚</span>
          <p className="text-sm text-orange-800 font-medium leading-snug">Additional delivery fees may apply based on your location</p>
        </div>
      </div>

      {/* Payment Button */}
      <div className="w-full px-6 pb-6 bg-white">
        <button
          onClick={onPayNow}
          className="w-full bg-[#FF4747] hover:bg-[#e03030] text-white py-4 rounded-full text-lg font-bold transition-all active:scale-[0.98]"
        >
          Pay Now
        </button>
      </div>

      {/* Footer */}
      <footer className="w-full px-6 py-6 text-center bg-white border-t border-gray-100">
        <div className="flex items-center justify-center gap-1 mb-4 text-gray-600">
          <span className="text-sm">Location:</span>
          <button className="flex items-center gap-0.5 text-sm font-semibold hover:text-[#FF4747]">
            {locationName} <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] leading-relaxed text-gray-400 font-normal max-w-[280px] mx-auto">
          By continuing you agree to our{' '}
          <a href="#" className="underline">Terms of Use</a>{' '}
          and{' '}
          <a href="#" className="underline">Privacy Policy</a>.
        </p>
      </footer>
    </div>
  );
};

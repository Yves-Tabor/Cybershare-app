import React from 'react'
import mainBg from "../assets/mainBg.png";

const Settings = () => {
  return (
    <div
      className="min-h-screen flex items-center justify-center text-[#e0e0e0]"
      style={{ 
        fontFamily: "'DM Sans', sans-serif",
        backgroundImage: `url(${mainBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="bg-[#080808]/75 min-h-screen">
        <div className="w-full max-w-[900px] mx-auto px-8 lg:px-12 pt-12 pb-20">
          <h1 className="text-[18px] font-semibold text-white tracking-tight mb-6">Settings</h1>
          <p className="text-[13px] text-[#888]">Settings functionality coming soon.</p>
        </div>
      </div>
    </div>
  )
}

export default Settings
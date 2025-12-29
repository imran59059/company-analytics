import React from 'react'

const TestCard = () => {
  return (
   <div className="bg-[url('./assets/9067.jpg')] bg-cover bg-center p-6 text-black font-sans">
      <div className="bg-opacity-50 p-4">
        <h2 className="text-xl font-bold mb-2">Head Office:</h2>
        <p>Furfura Darbar Sharif, Po - Furfura, Ps - Jangipara,</p>
        <p>Dist - Hooghly, Pin - 712 706, State - West Bengal</p>

        <h2 className="text-xl font-bold mt-4 mb-2 border-t border-black">Details of Holder:</h2>
        <p>Blood Gr. O +</p>
        <p>D.O.B. 01.05.1985 Sex: Male</p>
        <p>E-mail: imransiddique@gmail.com</p>
        <p>Address:</p>
        <p>Vill: Furfura Sharif Po: Furfura Ps: Janghipara</p>
        <p>Dist: Hooghly Pin: 712 706 Mob: +91-99328 74455</p>

        <div className="mt-4 border-t border-black pt-2">
          <p>Help line: mail id deba</p>
          <p>Web: jamiyateulamayebangla.com</p>
        </div>
      </div>
    </div>
  )
}

export default TestCard
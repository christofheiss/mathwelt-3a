// MathWelt 3A – öffentliche Einstellungen (darf auf GitHub liegen)
// Enthält KEINE Geheimnisse: nur den öffentlichen Schlüssel der Lehrperson und Prüfwerte (Hashes) der gültigen Codes.
export const CONFIG = {
  className: '3A',
  // Online-Speichern: Adresse des Cloudflare Workers (leer = nur Datei-Download) und privates Daten-Repo
  saveUrl: 'https://mathwelt-3a-save.c-heiss.workers.dev',
  dataRepo: 'christofheiss/mathwelt-3a-daten',
  teacherPublicKey: {"kty":"RSA","n":"vPjh6itlZhx2CpFHwY3HpyQJjsxJ58VfE9n0aHagQVaXY09EF28hGumu-uaH322S60sLhV1tZaW5Jtixy_Qvl4QnapzLuy9B8-2vVNLUdcai3w4PAaokQC6Z5ImB7ZUNvh9tdz2YHHz3ekKhVtUz_CCQTGEFLabYZ_RPBXoFPd1vmVKFWpFq6aQurVLWEKX8wxAr1VXmXzND0UEOrn8iemlqkj6KQGr6X0ZnEc2VckzZdbLfNfXIbQ98JDRepJImNXB3h67jpc25DvJxC52sKwRnyn-qXVwJ9GCO9dAYa8JkpXF8PZVmd2pbnj2nDvtx_AUMQSL9BHRaG7G0-UL7Hw","e":"AQAB","alg":"RSA-OAEP-256","ext":true,"key_ops":["encrypt"]},
  // Freigabe, solange der Worker nichts anderes meldet (gl = Gleichungen, aj = Alt und Jung)
  worlds: { gl: true, aj: false },
  tokenHashes: [
    '094a6afafbe7a39485a2bf92e7714387db9e7a6d3291c2db88dfea9162f20e6a', // 3A01
    '17a2dfe159aac2694d6c640ae3c11d7adf2aa26c53696c0886ce53155df7ea6a', // 3A02
    'b19b73830760f5027aa48f26f912606aeb9e96e3f5493128b66ac17689d193aa', // 3A03
    '173118019a50cf33ae592e4dc71dbda48ffbe82ec05aba2ba44d6a2c9b78cd7a', // 3A04
    '39f45473bdb6453dc137e159e482164e6a30786b17ec9e1d8e44d699b54f7cb4', // 3A05
    'd9c62e3e728a5e8f3746f96a3eda48fc3304e0c0423260c811589d2055c1afcc', // 3A06
    'cfcb59c9373f185af818a88bd05571e22f822c7b67ce3dd5e0a3f31e3da59b73', // 3A07
    '65053e12b97a0ae48c7d51e9092d964cb3d7a1edfc796c75906e07d43005fa6e', // 3A08
    '422a19a3ae3f34d3da072b41ef76adac1963fbbef9b3aa8390bcd87f2b35a72f', // 3A09
    'f11d57f8a6bff74a0e5be515da8ad5f34f23fe3ec94e2b82716ee0aaba8a832b', // 3A10
    'cf6a0ab2054057869fadc19aabaaf32b8c680362d32005e5b25e453e989fc446', // 3A11
    '1178d12705dca58fc637789f34b5e580b708bfa79ff4e20997fa46787b868687', // 3A12
    '5ef10dcb5cc3e57f8fa99113f48f81db854068ef19e93021a17d13d069b7114b', // 3A13
    'fbfae3ddd51d3fa58229cd54eb2315799ecd972c3fd08dd7c051c51ced0734f0', // 3A14
    'f73a2fbef316302909d52073e8386a2dcbf45c0e33dfc42d845388bb09774642', // 3A15
    '4f00530f5d74cb15e2fbdaefffc437b8b5f675ce7ec41f2eee48f1784ab694d0', // 3A16
    '2b963b971303f8ae4cc7c944a93f6d865179131ce926815fbd8d17af993dff1f', // 3A17
    '2b9f878fb97c1423c55900d7ea23821893ec23bef4724a933d662e4d57020d36', // 3A18
    'c65ca198f811fdff05fbafa90ca1567e98a4b0dda886f260e40f97eaf2b4df17', // 3A99 (Test Lehrperson)
  ]
};

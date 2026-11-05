// MathWelt 3A – öffentliche Einstellungen (darf auf GitHub liegen)
// Enthält KEINE Geheimnisse: nur den öffentlichen Schlüssel der Lehrperson und Prüfwerte (Hashes) der gültigen Codes.
export const CONFIG = {
  className: '3A',
  // Online-Speichern: Adresse des Cloudflare Workers (leer = nur Datei-Download) und privates Daten-Repo
  saveUrl: '',
  dataRepo: 'christofheiss/mathwelt-3a-daten',
  teacherPublicKey: {"kty":"RSA","n":"qy7MUmhJDluk6s2h2LOk5xXxgSolnBO47DQoCyQylWuHJJJ6qXjgoacsIyjUD96pe6RKYQW9_QOStP0tPYmtOtZ4Q37_PdABJ07O86KwFkvXSz8s_yrAUf_3X5KcVbisKiNhBp-2OGRUy9iUbZgV_ZEoYqCsNszjSwIfd6ACT2zsCG9xViEn7YiXBvEbCE_LNNkUnHeSgkEaQGw-DL9ze4AtHCREl7LiBqNWp0_wDLxgj0HE-Wk1RpEnAOjG64RmQGuDJTjCexduRj3IsyEzyCY5efP58oUclf0KsKNlMHehqjBHyFNGdxE2ggyfQYVYsIjZcLAgd-Y6Ftyjn0b_vw","e":"AQAB","alg":"RSA-OAEP-256","ext":true,"key_ops":["encrypt"]},
  tokenHashes: [
    '3708074d7187f9ff0ed65d782d169995d2bccfdf4af7e0747174c041b8adb58d', // 3A01
    '1130071ad3e681db844edb5ba6c5ebc8e40b13edbd3e8b7b32e04437bb778133', // 3A02
    'adaf7c573650ecff9ccf9bdce544b283c42b20c97174201e01aa6479e48fd16a', // 3A03
    '79371db26e581e4ef64c4b006818be87286d11e46640e083878bf9040f37f94c', // 3A04
    '113c2d567bb1c28fb9065ac714c9838f72da696fad797f5f8cc5131498e18432', // 3A05
    'b930b13e446944d51be2c6deaa939d2320deabaef58ab99ca0e1a8841d6911fa', // 3A06
    'beb4ac556d2d457841545fd60c59743121d3bda97b95be3810cfa1ce94abe3e9', // 3A07
    '6df458666006e692bd7461cd4be6a9482632932ada95e09cf3560dbb045ca4bf', // 3A08
    'f58453a4b5fc8b0f95863ec6dc0efc1b382dca0a573970e45c1e90753b2d0ba9', // 3A09
    'db9d1119fb744545eada17a645473273f4c2082fa79e018b9047a86c8c81e260', // 3A10
    '0e18b64c68e7f85986f5d43c5f667075f4bb6b88c1e0f8320370eb9768fd234a', // 3A11
    'acda6cab7b4caca0ee49065944a2692e1ffb107751f13152237ba34ad13ebfb3', // 3A12
    '1c9a2b1507e1be114561482a7b3ad6e2bfc9f0c767e541fede33c64299e82ba9', // 3A13
    '9473395ec776c3bbf12d7448d2e8420bbf53198ef09970fbdeb9e45ac76f5963', // 3A14
    '756466ac551d40200c6465db9951b3f09695e73a77c4dfd48b697711d0f63133', // 3A15
    '5ddd14a85a04192e498c6930b5fe33179580801fc149b66d59b9e2c0f481dab0', // 3A16
    '9a221da383d82d05e64bf495772b2a959542c660f503f6d8d029c8e2ab0dac30', // 3A17
    'f72a39d62bbea2eea3e658bec36b7767c8f583c4f69fc16065e03ffcc917e01c', // 3A18
    'ec21db9725af11c1cb2911e3b0388c38e895e1449169ac1320769618b47df3db', // 3A99 (Test Lehrperson)
  ]
};

# Módulo 1: OWASP A02:2021 – Cryptographic Failures

## 1. Descripción
Este módulo analiza el almacenamiento inseguro de credenciales dentro de aplicaciones web modernas basadas en la arquitectura MERN.

### ¿Qué es la vulnerabilidad?
- Datos sensibles son almacenados o transmitidos en texto claro o utilizando algoritmos obsoletos (MD5 o SHA-1)
- **Riesgo:** Un atacante puede acceder a bases de datos (NoSQL injection) y obtiene acceso inmediato a todas las cuentas de usuario. 
- **Estándar moderno:** Los datos se hasehan con un algoritmo adaptativo como Bcrypt o Argon2

## 2. Escenario Vulnerable
- **Endpoint:** `POST /api/auth/register`
- **Falla detectada:** La aplicación recibe el valor `password` y lo persiste directamente en MongoDB sin ninguna transformación criptográfica.
- **Impacto:** Exposición total de contraseñas ante accesos no autorizados a la base de datos o volcados de logs.

## 3. Prueba de Concepto (PoC)
1. Registro del usuario `victima_lab` con contraseña `SuperSecreta123!`.
2. Consulta directa a la colección `users` en MongoDB Atlas.
3. Se evidencia el campo `password: "SuperSecreta123!"` legible en texto plano.

## 4. Remediación
- Para corregir la vulnerabilidad se aplicó:
- **Hashing unidireccional** imposible de revertir matematicamente.
- **Salt(Salting)** cada pseudoaleatoria añadida antes de hashear para evitar ataques por tablas arcoíris(raibow tables).
- **Cost factor(Rounds)** Determina cuánto trabajo computacional toma calcular el hash dificultando ataques por fuerza bruta.
- Se integró la librería `bcryptjs`.
- Se configuró la generación de sal con 10 rondas de complejidad (`bcrypt.genSalt(10)`).
- La autenticación en `/login` fue modificada para utilizar `bcrypt.compare()`, mitigando además ataques de temporización (*timing attacks*).

## 5. Resultado tras el parche
En MongoDB Atlas, la contraseña se visualiza con el formato:
`$2a$10$abcdef...` (formato Modular Crypt Format de Bcrypt).
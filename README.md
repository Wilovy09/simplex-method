# Metodo Simplex — Visualizador Interactivo

Abre `index.html` en el navegador. No requiere instalacion ni servidor.

---

## Como usar

### 1. Problema por defecto

Al abrir la app ya viene cargado este problema:

```
Maximizar Z = 3x₁ + 2x₂
s.a.  2x₁ +  x₂ ≤ 18
      2x₁ + 3x₂ ≤ 42
      3x₁ +  x₂ ≤ 24
      x₁, x₂ ≥ 0
```

Solo presiona **"Resolver paso a paso"**.

---

### 2. Ingresar tu propio problema

1. Presiona **"Editar problema"**
2. Ajusta el numero de **variables de decision** y **restricciones**
3. Presiona **"Actualizar tabla"** si cambiaste las cantidades
4. Llena los coeficientes de la **funcion objetivo**
5. Llena los coeficientes de cada **restriccion** y su valor `≤`
6. Presiona **"Aplicar problema"**
7. Presiona **"Resolver paso a paso"**

> Solo soporta restricciones del tipo `≤` (forma estandar para maximizacion).

---

## Ejemplos

### Ejemplo 1 — Problema basico (2 variables, 2 restricciones)

```
Maximizar Z = 5x₁ + 4x₂
s.a.  6x₁ + 4x₂ ≤ 24
      x₁  + 2x₂ ≤ 6
      x₁, x₂ ≥ 0
```

| Campo              | Valor |
|--------------------|-------|
| Variables          | `2`   |
| Restricciones      | `2`   |
| Obj: x₁            | `5`   |
| Obj: x₂            | `4`   |
| R1: x₁ · x₂ · ≤   | `6` · `4` · `24` |
| R2: x₁ · x₂ · ≤   | `1` · `2` · `6`  |

**Solucion optima:** x₁ = 3, x₂ = 3/2, Z = 21

---

### Ejemplo 2 — Del cuaderno (2 variables, 3 restricciones)

```
Maximizar Z = 3x₁ + 2x₂
s.a.  2x₁ +  x₂ ≤ 18
      2x₁ + 3x₂ ≤ 42
      3x₁ +  x₂ ≤ 24
      x₁, x₂ ≥ 0
```

| Campo              | Valor |
|--------------------|-------|
| Variables          | `2`   |
| Restricciones      | `3`   |
| Obj: x₁            | `3`   |
| Obj: x₂            | `2`   |
| R1: x₁ · x₂ · ≤   | `2` · `1` · `18` |
| R2: x₁ · x₂ · ≤   | `2` · `3` · `42` |
| R3: x₁ · x₂ · ≤   | `3` · `1` · `24` |

**Solucion optima:** x₁ = 8, x₂ = 2, Z = 28

---

### Ejemplo 3 — 3 variables, 3 restricciones

```
Maximizar Z = 2x₁ + 3x₂ + x₃
s.a.  x₁ + 2x₂ +  x₃ ≤ 14
      3x₁ +  x₂ + x₃ ≤ 14
      x₁ +  x₂       ≤ 8
      x₁, x₂, x₃ ≥ 0
```

| Campo                   | Valor |
|-------------------------|-------|
| Variables               | `3`   |
| Restricciones           | `3`   |
| Obj: x₁ · x₂ · x₃      | `2` · `3` · `1` |
| R1: x₁ · x₂ · x₃ · ≤   | `1` · `2` · `1` · `14` |
| R2: x₁ · x₂ · x₃ · ≤   | `3` · `1` · `1` · `14` |
| R3: x₁ · x₂ · x₃ · ≤   | `1` · `1` · `0` · `8`  |

**Solucion optima:** x₁ = 0, x₂ = 7, x₃ = 0, Z = 21

---

## Navegacion

| Accion               | Como                              |
|----------------------|-----------------------------------|
| Siguiente paso       | Boton "Siguiente" o tecla →       |
| Paso anterior        | Boton "Anterior" o tecla ←        |
| Saltar a un paso     | Click en los puntos de navegacion |

## Codigo de colores

| Color   | Significado              |
|---------|--------------------------|
| Azul    | Variable entrante        |
| Amarillo| Variable saliente        |
| Rojo    | Elemento pivote          |
| Verde   | Razon minima / Optimo    |

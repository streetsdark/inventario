# 🔄 GUÍA DE USO: Sistema de Devoluciones en Movimientos

## ¿Qué cambió?

Ahora puedes **seleccionar directamente desde la "Previsualizacion de salidas"** los productos que están **"Pendiente por devolver"** para registrar rápidamente su devolución. 

**Cuando registras la devolución:**
- ✅ El estado cambia de **"Pendiente por devolver"** a **"Devuelto"** 
- ✅ El stock se incrementa automáticamente
- ✅ Se actualiza en Firestore
- ✅ Se refleja en los Excel exportados
- ✅ La UI se actualiza en tiempo real

---

## 📋 Cómo funciona

### **1️⃣ Paso 1: Identifica los pendientes**
En la sección "Previsualizacion de salidas" (abajo), verás todos los productos entregados.

**Estados posibles:**
- 🟨 **"Pendiente por devolver"** (Amarillo) = seleccionable ✅
- 🟩 **"Entregado"** (Verde) = no se espera devolución
- 🟦 **"Devuelto"** (Azul) = ya fue devuelto ✅

### **2️⃣ Paso 2: Selecciona el producto**
Haz **click en el item** que dice **"Pendiente por devolver"**.

**El item seleccionado:**
- Cambiará a color azul claro
- Tendrá borde azul con sombra
- Se verá un aviso **amarillo** en el formulario de arriba

### **3️⃣ Paso 3: Ingresa la cantidad devuelta**
El formulario se llenará automáticamente con:
- ✅ Producto (código, descripción, stock actual)
- ✅ Tipo de movimiento = **"Entrada"** (automático)
- ✅ Fecha = **Hoy** (puedes cambiar)

Solo debes ingresar: **¿Cuánto se devolvió?**

### **4️⃣ Paso 4: Guardar**
Haz click en **"Guardar"** para registrar la devolución.

**Sucede automáticamente:**
- 📊 Stock del producto se incrementa
- 🔄 Estado cambia a **"Devuelto"** en la base de datos
- 📈 Se agrega un registro de entrada (devolución)
- 💾 Se actualiza en Firestore
- 📁 Se refleja en los Excel (cuando exportes)

---

## 🎯 Ejemplo Práctico

**Escenario:** Juan recibió 10 metros de tela hace 3 días. Ahora devuelve 3 metros.

```
1. Buscas en "Previsualizacion de salidas"
   → "Tela blanca - Pendiente por devolver" (Amarillo)

2. Click en ese item

3. El formulario muestra:
   - Código: [código de tela]
   - Descripción: Tela blanca
   - Stock actual: 50 metros
   - Tipo: Entrada ✓ (automático)
   - Cantidad: [Ingresa 3]

4. Click en Guardar

5. Resultado: 
   ✓ Estado cambia a "Devuelto" (Azul)
   ✓ Stock nuevo = 50 + 3 = 53 metros
   ✓ Se registra entrada de 3 metros
```

---

## 🎨 Indicadores Visuales

| Estado | Color | Significado | Acción |
|--------|-------|-------------|--------|
| Pendiente por devolver | 🟨 Amarillo | Espera devolución | Click para devolver |
| Entregado | 🟩 Verde | Material entregado sin retorno | No clickeable |
| Devuelto | 🟦 Azul | Devolución registrada | No clickeable |

---

## 💾 Base de Datos & Excel

### Cambios en Firestore:
Cuando registras devolución, se actualiza el documento original:
```javascript
{
  deliveryStatus: "devuelto",  // Cambió de "pendiente por devolver"
  returnDate: "2026-05-04",    // Nueva: fecha de devolución
  returnQuantity: 3             // Nueva: cantidad devuelta
}
```

### Cambios en Excel:
La columna "Estado" en el Excel muestra automáticamente:
- "pendiente por devolver"
- "entregado"
- "devuelto"

El Excel se actualiza cuando **exportas nuevamente**.

---

## ⚙️ Cambios Técnicos

### Nuevos estados:
```javascript
const [selectedReturnMove, setSelectedReturnMove] = useState(null);
```

### Nueva función mejorada:
```javascript
const handleSelectReturnMove = (move) => {
  // Solo permite seleccionar "pendiente por devolver"
  // Rechaza automáticamente otros estados
}
```

### En la transacción Firestore:
```javascript
if (returnMoveRef) {
  transaction.update(returnMoveRef, {
    deliveryStatus: 'devuelto',      // Cambio de estado
    returnDate: moveDate,             // Fecha de devolución
    returnQuantity: parsedQuantity,   // Cantidad devuelta
  });
}
```

### Mensaje de confirmación:
```
✓ Devolución registrada correctamente.

El producto 'Tela blanca' cambió de estado a "DEVUELTO" 
y el stock se incrementó en 3 metros.
```

---

## 💡 Tips

1. **Rápido:** Usa la barra de filtro para buscar por usuario
2. **Flexible:** Puedes hacer devoluciones parciales (ingresas cantidad específica)
3. **Auditable:** Todo queda registrado con:
   - Fecha original de salida
   - Fecha de devolución
   - Cantidad devuelta
   - Quién lo recibió
4. **Visible:** El estado se actualiza en tiempo real en la pantalla

---

## 🔍 Nota Técnica

**¿Por qué solo "Pendiente por devolver" es clickeable?**

Porque solo esos items esperan una acción. Los otros estados significan:
- **Entregado:** Material fue entregado sin retorno (documento/servicio, etc.)
- **Devuelto:** La devolución ya fue registrada (no necesita acción)

---

## ❌ Posibles Errores

| Error | Causa | Solución |
|-------|-------|----------|
| "Selecciona un producto" | No seleccionaste item | Click en un "Pendiente por devolver" |
| "Cantidad debe ser mayor a cero" | Dejaste cantidad vacía | Ingresa cantidad devuelta |
| Item no se actualiza | Recarga lenta | Espera unos segundos o recarga la página |
| Excel no muestra estado nuevo | No exportaste nuevamente | Exporta nuevamente después de guardar |




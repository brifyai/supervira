# Guía de Demostración - VIRA

## Preparación Pre-Demo

### Checklist
- [ ] Servidor corriendo (`yarn dev`)
- [ ] Usuario demo logueado
- [ ] Al menos 10 noticias recientes en DB
- [ ] 1-2 campañas publicitarias activas
- [ ] VoiceMaker con créditos

### Datos Demo Recomendados

| Elemento | Cantidad | Notas |
|----------|----------|-------|
| Fuentes | 3-5 | BioBio, CNN Chile, etc |
| Noticias | 10-20 | Menos de 24h |
| Publicidades | 2 | Con audio subido |
| Radio | 1 | Nombre configurado |

---

## Flujo de Demo (10 min)

### 1. Login y Dashboard (1 min)
- Mostrar login
- Vista general del dashboard

### 2. Gestión de Fuentes (2 min)
- Navegar a "Fuentes"
- Mostrar fuentes activas
- Ejecutar un escaneo rápido

### 3. Crear Noticiero (4 min)
- Ir a "Crear Noticiero"
- Seleccionar región: **Nacional**
- Duración: **10 minutos**
- Seleccionar categorías
- Mostrar selección de noticias
- Configurar voz (Vicente)
- **Generar noticiero**

### 4. Editar Timeline (2 min)
- Mostrar timeline generado
- Demostrar drag & drop
- Reproducir una noticia individual
- Agregar publicidad manualmente

### 5. Generar Audio Final (1 min)
- Click "Generar Audio"
- Mostrar progreso
- Reproducir resultado final

---

## Puntos Clave a Destacar

✅ **Automatización**: De noticias a audio en minutos  
✅ **Personalización**: Voz, duración, categorías  
✅ **Edición visual**: Timeline drag & drop  
✅ **Multi-tenant**: Cada cliente tiene su espacio  
✅ **IA chilena**: Tono y estilo de radio local  

---

## En Caso de Problemas

| Problema | Solución Rápida |
|----------|-----------------|
| Sin noticias | Ejecutar scraping previo |
| Error TTS | Usar demo pre-grabado |
| Lento | Reducir a 5 min duración |

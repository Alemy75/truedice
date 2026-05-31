# BetSpinner — пиксельная анимация ставки 🎲

Прозрачная квадратная Canvas-анимация для крипто-казино: золотой кубик с
золотыми монетами и пальмовыми листьями, в стиле сайта. Крутится, пока идёт
ставка, и плавно замирает при результате. Чистый JS, без зависимостей.

---

## Состав

| Файл | Назначение |
|------|------------|
| `casino-spinner.js` | Движок анимации (единственный обязательный файл) |
| `Bet Spinner Pixel.html` | Демо-страница с кнопкой ставки и панелью настроек |
| `README.md` | Эта инструкция |

> Демо использует React и панель Tweaks только для витрины настроек.
> **Для сайта нужен только `casino-spinner.js`** — он ни от чего не зависит.

---

## Быстрый старт

```html
<canvas id="spin" style="width:200px; height:200px"></canvas>

<script src="casino-spinner.js"></script>
<script>
  // style: 'pixel' (16-бит) или 'illustrated' (глянцевый)
  const spinner = new CasinoSpinner(
    document.getElementById('spin'),
    { style: 'pixel', pixelRes: 48 }
  );

  // запускать и останавливать по событиям ставки:
  function onBetPlaced() { spinner.start(); }  // раскрутить
  function onBetResult() { spinner.stop();  }  // плавно остановить
</script>
```

Фон canvas остаётся **полностью прозрачным** — элемент ляжет на любую секцию.
Размер задаётся через CSS (`width`/`height` canvas); анимация сама подстроится
под него и под Retina-экраны.

---

## Параметры конструктора

```js
new CasinoSpinner(canvasElement, {
  style:    'pixel',        // 'pixel' | 'illustrated'
  pixelRes: 48,             // размер пиксельной сетки: меньше = крупнее пиксели
  speed:    1,              // множитель скорости вращения
  autoplay: false,          // запустить сразу при создании
  colors:   { /* см. ниже */ }
});
```

### colors (необязательно)

Все цвета можно переопределить под палитру сайта:

```js
colors: {
  dieLight: '#FBE07A',  dieMid: '#E3A92A',  dieDark: '#8F5E12',  // кубик
  pip:      '#3A2206',                                           // точки
  coinLight:'#FFE98C',  coinMid:'#E8B22E',  coinDark:'#9C6B12',  // монеты
  coinRim:  '#7A4F0E',
  leaf:     '#7BC62E',  leafMid:'#4E9E22',  leafDark:'#256A18',  // листья
  glow:     '#FFB733',  accent: '#F2C14E'                        // свечение
}
```

---

## Методы

| Метод | Действие |
|-------|----------|
| `spinner.start()` | Раскрутить (вызывать при размещении ставки) |
| `spinner.stop()` | Плавно остановить до лёгкого покачивания (при результате) |
| `spinner.toggle()` | Переключить и вернуть текущее состояние (`true`/`false`) |
| `spinner.setStyle('pixel' \| 'illustrated')` | Сменить стиль на лету |
| `spinner.setColors({...})` | Обновить палитру на лету |
| `spinner.destroy()` | Остановить анимацию и снять обработчики |

Свойства `spinner.baseSpeed` и `spinner.pixelRes` можно менять напрямую в любой момент.

---

## Пример интеграции

```js
const spinner = new CasinoSpinner(canvas, { style: 'pixel' });

placeBetButton.addEventListener('click', async () => {
  spinner.start();                 // крутим, пока ждём ответ сервера
  const result = await api.placeBet(amount);
  spinner.stop();                  // получили результат — тормозим
  showResult(result);
});
```

---

## Заметки

- **Прозрачность:** canvas никогда не заливается фоном — кладите поверх чего угодно.
- **Адаптивность:** меняйте CSS-размер canvas — анимация подстроится автоматически.
- **Производительность:** один `requestAnimationFrame`-цикл; в покое крутится
  очень медленно («дышит»), при `start()` ускоряется.
- **Пиксельный стиль:** `pixelRes` — это разрешение внутренней сетки.
  48 ≈ крупный ретро-пиксель, 96–120 — мельче и чище.

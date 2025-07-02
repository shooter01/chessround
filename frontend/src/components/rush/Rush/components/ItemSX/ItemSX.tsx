// components/ItemSX/ItemSX.tsx
export default function ItemSX(active: boolean) {
  return {
    flex: 1,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'transform .2s, filter .2s, box-shadow .2s',
    transform: active ? 'scale(1.1)' : 'scale(1)',
    // добавили boxShadow для подсветки
    boxShadow: active
      ? '0 0 16px rgba(255, 215, 0, 0.8)' // мягкая золотистая тень
      : 'none',
    '&:hover': {
      filter: 'drop-shadow(0 0 12px rgba(0,0,0,0.4))',
      transform: 'scale(1.05)',
    },
  };
}

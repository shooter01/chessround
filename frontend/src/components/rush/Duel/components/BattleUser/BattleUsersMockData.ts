import { BattleUserProps } from './ResultBattleUser';

export const mockCountries: Record<string, string> = {
  US: 'United States',
  RU: 'Russia',
  DE: 'Germany',
};

export const mockUsers: BattleUserProps[] = [
  {
    userclass: 'p1',
    user_id: '1',
    user_name: 'Alice',
    player_online: true,
    rating: 1500,
    errors_array: [false, false, true], // 8 ошибок
    country: `http://chesscup.org/images/flags/US.png`, // Путь к флагу США
    countries: mockCountries,
    image: 'http://chesscup.org/uploads/037893f1b74a909693b330a671ec69251611631128083.jpeg',
    points: 10,
    efforts_array: [
      // 12 успехов
      { id: '101', result: true },
      { id: '102', result: true },
      { id: '103', result: true },
      { id: '104', result: true },
      { id: '105', result: true },
      { id: '106', result: true },
      { id: '107', result: true },
      { id: '108', result: true },
      { id: '109', result: true },
      { id: '110', result: true },
      { id: '111', result: true },
      { id: '112', result: true },
      // 8 неудач
      { id: '113', result: false },
      { id: '114', result: false },
      { id: '115', result: false },
      { id: '116', result: false },
      { id: '117', result: false },
      { id: '118', result: false },
      { id: '119', result: false },
      { id: '120', result: false },
    ],
  },
  {
    userclass: 'p2',
    user_id: '2',
    user_name: 'Bob',
    player_online: false,
    rating: 1400,
    errors_array: [false, false, true], // 8 ошибок
    country: `http://chesscup.org/images/flags/RU.png`, // Путь к флагу России
    countries: mockCountries,
    image: 'http://chesscup.org/uploads/1a3a4582dd6c4a6a6a1a9a601260586e1664653440678.jpeg',
    points: 8,
    efforts_array: [
      // 8 успехов
      { id: '201', result: true },
      { id: '202', result: true },
      { id: '203', result: true },
      { id: '204', result: true },
      { id: '205', result: true },
      { id: '206', result: true },
      { id: '207', result: true },
      { id: '208', result: true },
      // 12 неудач
      { id: '209', result: false },
      { id: '210', result: false },
      { id: '211', result: false },
      { id: '212', result: false },
      { id: '213', result: false },
      { id: '214', result: false },
      { id: '215', result: false },
      { id: '216', result: false },
      { id: '217', result: false },
      { id: '218', result: false },
      { id: '219', result: false },
      { id: '220', result: false },
    ],
  },
];

export const textResult = 'Alice wins!';

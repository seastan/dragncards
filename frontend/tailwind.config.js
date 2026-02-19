module.exports = {
  purge: [
    './src/**/*.html',
    './src/**/*.ts',
    './src/**/*.tsx',
    './src/**/*.js',
    './src/**/*.jsx',
  ],
  theme: {
    extend: {
      backgroundColor: ['odd', 'even'],
      width: {
        "1/100": "1",
        "2/100": "2",
        "4/100": "4",
        "8/100": "8",
        "16/100": "16",
        "32/100": "32",
        "64/100": "64",
        "1/48": "0.02083333333"
      },
      maxHeight: {
        "3/4": "75%"
      },
      colors: {
        "black-80": "rgba(0,0,0,0.8)",
        "black-70": "rgba(0,0,0,0.7)",
        "black-60": "rgba(0,0,0,0.6)",
        "black-50": "rgba(0,0,0,0.5)",
        "black-40": "rgba(0,0,0,0.4)",
        "blue-400-50": "rgba(99,179,237,0.5)",
        "yellow-950": "#271605",
        'gray-550': '#5a6474',
        'gray-600-10': 'rgba(75, 85, 99, 0.1)',  // bg-gray-600 with 10% opacity
        'gray-600-20': 'rgba(75, 85, 99, 0.2)',  // bg-gray-600 with 20% opacity
        'gray-600-30': 'rgba(75, 85, 99, 0.3)',  // bg-gray-600 with 30% opacity
        'gray-600-40': 'rgba(75, 85, 99, 0.4)',  // bg-gray-600 with 40% opacity
        'gray-600-50': 'rgba(75, 85, 99, 0.5)',  // bg-gray-600 with 50% opacity
        'gray-600-60': 'rgba(75, 85, 99, 0.6)',  // bg-gray-600 with 60% opacity
        'gray-600-70': 'rgba(75, 85, 99, 0.7)',  // bg-gray-600 with 70% opacity
        'gray-600-80': 'rgba(75, 85, 99, 0.8)',  // bg-gray-600 with 80% opacity
        'gray-600-90': 'rgba(75, 85, 99, 0.9)',  // bg-gray-600 with 90% opacity
        'red-600-10': 'rgba(220, 38, 38, 0.1)',  // bg-red-600 with 10% opacity
        'red-600-20': 'rgba(220, 38, 38, 0.2)',  // bg-red-600 with 20% opacity
        'red-600-30': 'rgba(220, 38, 38, 0.3)',  // bg-red-600 with 30% opacity
        'red-600-40': 'rgba(220, 38, 38, 0.4)',  // bg-red-600 with 40% opacity
        'red-600-50': 'rgba(220, 38, 38, 0.5)',  // bg-red-600 with 50% opacity
        'red-600-60': 'rgba(220, 38, 38, 0.6)',  // bg-red-600 with 60% opacity
        'red-600-70': 'rgba(220, 38, 38, 0.7)',  // bg-red-600 with 70% opacity
        'red-600-80': 'rgba(220, 38, 38, 0.8)',  // bg-red-600 with 80% opacity
        'red-600-90': 'rgba(220, 38, 38, 0.9)',  // bg-red-600 with 90% opacity
      },
      spacing: {
        "72": "18rem",
        "96": "24rem",
        "112": "28rem",
        "128": "32rem",
        "192": "48rem",
        "256": "64rem"
      },
      zIndex: {
        "2000": 2000,
        "10000": 10000
      },
      opacity: {
        '0': '0',
       '10': '.1',
       '20': '.2',
       '30': '.3',
       '40': '.4',
       '50': '.5',
       '60': '.6',
       '70': '.7',
       '80': '.8',
       '90': '.9',
       '100': '1',
      },
      boxShadow: {
        yellow: '0 0 7px yellow',
        red: '0 0 10px red',
        green: '0 0 10px green',
      }
    }
  }
};

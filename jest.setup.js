// 네이티브 모듈이라 jest 환경에서는 라이브러리 제공 mock으로 대체한다
jest.mock('react-native-keyboard-controller', () => require('react-native-keyboard-controller/jest'));

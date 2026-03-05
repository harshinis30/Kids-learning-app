/**
 * writing-stage1.tsx — Thin route wrapper for the Writing Module.
 *
 * This file only exists to register the route in Expo Router's file-based
 * navigation. All logic lives in the isolated module folder.
 *
 * To remove the writing module: delete this file + src/modules/writing/
 * and remove the <Tabs.Screen name="writing-stage1" /> entry in _layout.tsx.
 */
export { default } from '../../src/modules/writing/screens/Stage1Scene1';

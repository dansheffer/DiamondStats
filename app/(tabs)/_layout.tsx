import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF5910',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle:
          Platform.OS === 'ios'
            ? {
                position: 'absolute',
                borderTopWidth: 0,
                backgroundColor: 'transparent',
                elevation: 0,
              }
            : undefined,
        tabBarBackground:
          Platform.OS === 'ios'
            ? () => (
                <BlurView
                  tint="systemChromeMaterial"
                  intensity={100}
                  style={StyleSheet.absoluteFill}
                />
              )
            : undefined,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Players',
          tabBarIcon: ({ color, focused }) =>
            Platform.OS === 'ios' ? (
              <SymbolView
                name={focused ? 'person.2.fill' : 'person.2'}
                tintColor={color}
                size={26}
              />
            ) : null,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) =>
            Platform.OS === 'ios' ? (
              <SymbolView
                name={focused ? 'magnifyingglass.circle.fill' : 'magnifyingglass'}
                tintColor={color}
                size={26}
              />
            ) : null,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          tabBarIcon: ({ color, focused }) =>
            Platform.OS === 'ios' ? (
              <SymbolView
                name={focused ? 'dot.radiowaves.left.and.right' : 'antenna.radiowaves.left.and.right'}
                tintColor={color}
                size={26}
              />
            ) : null,
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: 'News',
          tabBarIcon: ({ color, focused }) =>
            Platform.OS === 'ios' ? (
              <SymbolView
                name={focused ? 'newspaper.fill' : 'newspaper'}
                tintColor={color}
                size={26}
              />
            ) : null,
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: 'Compare',
          tabBarIcon: ({ color, focused }) =>
            Platform.OS === 'ios' ? (
              <SymbolView
                name={focused ? 'chart.bar.xaxis' : 'chart.bar'}
                tintColor={color}
                size={26}
              />
            ) : null,
        }}
      />
      <Tabs.Screen
        name="calculator"
        options={{
          title: 'Calculator',
          tabBarIcon: ({ color, focused }) =>
            Platform.OS === 'ios' ? (
              <SymbolView
                name={focused ? 'dollarsign.circle.fill' : 'dollarsign.circle'}
                tintColor={color}
                size={26}
              />
            ) : null,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          tabBarIcon: ({ color, focused }) =>
            Platform.OS === 'ios' ? (
              <SymbolView
                name={focused ? 'info.circle.fill' : 'info.circle'}
                tintColor={color}
                size={26}
              />
            ) : null,
        }}
      />
    </Tabs>
  );
}

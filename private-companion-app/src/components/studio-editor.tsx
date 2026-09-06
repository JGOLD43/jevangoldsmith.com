import { Image } from 'expo-image';
import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Chip } from '@/components/ui';
import { Fonts } from '@/constants/theme';
import { readDocument, writeDocument, type StudioBlock, type StudioDocument } from '@/domain/studio-document.cjs';
import { useTheme } from '@/hooks/use-theme';
import { pickStudioMedia } from '@/services/studio-media';

const newText = (): StudioBlock => ({ type: 'text', text: '', font: 'sans', style: 'paragraph' });

export function StudioEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const colors = useTheme();
  const [adding, setAdding] = useState(false);
  const document = useMemo<StudioDocument>(() => readDocument(value) ?? { version: 1, blocks: [{ ...newText(), text: value } as StudioBlock] }, [value]);
  const documentRef = useRef(document);
  documentRef.current = document;
  const change = (blocks: StudioBlock[]) => onChange(writeDocument({ version: 1, blocks }));
  const update = (index: number, patch: Partial<StudioBlock>) => change(document.blocks.map((block, i) => i === index ? { ...block, ...patch } as StudioBlock : block));
  const move = (index: number, direction: number) => {
    const blocks = [...document.blocks];
    [blocks[index], blocks[index + direction]] = [blocks[index + direction], blocks[index]];
    change(blocks);
  };
  const addMedia = async (type: 'image' | 'video') => {
    setAdding(true);
    try { const block = await pickStudioMedia(type); if (block) change([...documentRef.current.blocks, block]); }
    catch (error) { Alert.alert('Could not add media', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setAdding(false); }
  };
  const inputStyle = { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.line, borderWidth: 1, borderRadius: 10, padding: 12 };
  return <View style={{ gap: 14 }}>
    <Text style={{ color: colors.textSecondary }}>Build your story in order. Photos and videos stay on this phone until you publish.</Text>
    {document.blocks.map((block, index) => <View key={index} style={{ gap: 8, borderWidth: 1, borderColor: colors.line, padding: 12, borderRadius: 14 }}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary, flex: 1 }}>{index + 1} · {block.type}</Text>
        {index > 0 ? <Pressable accessibilityLabel="Move block up" onPress={() => move(index, -1)}><Text style={{ color: colors.accent, padding: 8 }}>↑</Text></Pressable> : null}
        {index < document.blocks.length - 1 ? <Pressable accessibilityLabel="Move block down" onPress={() => move(index, 1)}><Text style={{ color: colors.accent, padding: 8 }}>↓</Text></Pressable> : null}
        <Pressable onPress={() => Alert.alert('Remove this block?', 'This removes it from this draft.', [{ text: 'Keep', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => change(document.blocks.filter((_, i) => i !== index)) }])}><Text style={{ color: colors.danger, padding: 8 }}>Remove</Text></Pressable>
      </View>
      {block.type === 'text' ? <>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{(['sans', 'serif', 'mono'] as const).map((font) => <Chip key={font} label={{ sans: 'Modern', serif: 'Book', mono: 'Typewriter' }[font]} selected={block.font === font} onPress={() => update(index, { font })} />)}</View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{(['paragraph', 'heading', 'quote'] as const).map((style) => <Chip key={style} label={style} selected={block.style === style} onPress={() => update(index, { style })} />)}</View>
        <TextInput accessibilityLabel={`Text block ${index + 1}`} multiline textAlignVertical="top" value={block.text} onChangeText={(text) => update(index, { text })} placeholder="Write here…" placeholderTextColor={colors.textSecondary} style={[inputStyle, { minHeight: 130, fontFamily: block.font === 'sans' ? Fonts.sans : block.font === 'serif' ? 'serif' : 'monospace', fontSize: block.style === 'heading' ? 23 : 17 }]} />
      </> : <>
        {block.type === 'image' ? <Image source={block.src.startsWith('/') ? `https://jevangoldsmith.com${block.src}` : block.src} contentFit="contain" style={{ width: '100%', height: 220 }} /> : <Text style={{ color: colors.text }}>Video attached · {block.src.split('/').pop()}</Text>}
        <TextInput accessibilityLabel="Media caption" value={block.caption} onChangeText={(caption) => update(index, { caption })} placeholder="Caption / photo description" placeholderTextColor={colors.textSecondary} style={inputStyle} />
      </>}
    </View>)}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Chip label="+ Text" onPress={() => change([...document.blocks, newText()])} />
      <Chip label={adding ? 'Adding…' : '+ Photo'} onPress={() => { if (!adding) void addMedia('image'); }} />
      <Chip label={adding ? 'Adding…' : '+ Video'} onPress={() => { if (!adding) void addMedia('video'); }} />
    </View>
  </View>;
}

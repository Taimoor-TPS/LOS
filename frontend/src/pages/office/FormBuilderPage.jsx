import { useEffect, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { api } from '../../api/client.js';
import { PageTitle } from '../../components/office/OfficeShell.jsx';

function toCss(transform) {
  if (!transform) return undefined;
  return `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`;
}

function Row({ id, label }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return <div ref={setNodeRef} style={{ transform: toCss(transform), transition }} {...attributes} {...listeners}>{label}</div>;
}

export default function FormBuilderPage() {
  const [forms, setForms] = useState([]);
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState(null);
  const [palette, setPalette] = useState('');
  const [error, setError] = useState('');
  const sensors = useSensors(useSensor(PointerSensor));
  useEffect(() => {
    api('/api/config/forms?pageSize=50').then((data) => setForms(data.items || []));
    api('/api/config/fields?pageSize=100').then((data) => setFields(data.items || []));
  }, []);
  const slots = (form?.sections || []).flatMap((section) => (section.fields || []).map((field) => field.fieldCode));
  function add(fieldCode) {
    const sections = form.sections?.length ? [...form.sections] : [{ code: 'extra', title: { en: 'Extra' }, fields: [] }];
    sections[0] = { ...sections[0], fields: [...(sections[0].fields || []), { fieldCode, required: false }] };
    setForm({ ...form, sections });
  }
  async function save() {
    await api(`/api/config/forms/${form._id}`, { method: 'PATCH', body: { version: form.version, sections: form.sections } });
    const published = await api(`/api/config/forms/${form._id}/publish`, { method: 'POST', body: { reason: 'Publish form' } });
    setForm(published.item);
  }
  return (
    <div>
      <PageTitle kicker="Configuration" title="Form builder" />
      {error && <p className="bad">{error}</p>}
      <label className="field">Form
        <select value={form?._id || ''} onChange={(event) => setForm(forms.find((item) => item._id === event.target.value) || null)}>
          <option value="">Select</option>
          {forms.map((item) => <option key={item._id} value={item._id}>{item.code}</option>)}
        </select>
      </label>
      {form && (
        <div className="builder">
          <aside>
            <input placeholder="Search fields" value={palette} onChange={(event) => setPalette(event.target.value)} />
            {fields.filter((field) => field.fieldCode.includes(palette)).map((field) => (
              <button key={field.fieldCode} className="ghost" type="button" onClick={() => add(field.fieldCode)}>{field.label?.en || field.fieldCode}</button>
            ))}
          </aside>
          <DndContext sensors={sensors} onDragEnd={({ active, over }) => {
            if (!over || active.id === over.id) return;
            const codes = arrayMove(slots, slots.indexOf(active.id), slots.indexOf(over.id));
            const section = { ...(form.sections[0] || { code: 'main', title: { en: 'Main' } }), fields: codes.map((fieldCode) => ({ fieldCode, required: false })) };
            setForm({ ...form, sections: [section, ...form.sections.slice(1)] });
          }}>
            <SortableContext items={slots} strategy={verticalListSortingStrategy}>
              <div className="canvas">{slots.map((id) => <Row key={id} id={id} label={id} />)}</div>
            </SortableContext>
          </DndContext>
          <aside className="preview">
            <div className="phone-preview">{slots.map((id) => <label key={id}>{id}<input readOnly /></label>)}</div>
          </aside>
        </div>
      )}
      {form && <button className="primary" type="button" onClick={() => save().catch((err) => setError(err.message))}>Publish</button>}
    </div>
  );
}

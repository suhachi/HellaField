import React, { forwardRef } from 'react';
import { Job, Section, Photo } from '../../lib/db';

type Props = {
    job: Job;
    sections: Section[];
    photosBySection: Record<string, Photo[]>;
};

const ReportTemplate = forwardRef<HTMLDivElement, Props>(({ job, sections, photosBySection }, ref) => {
    // A4 Width: 210mm (~794px at 96dpi), Height: 297mm (~1123px)
    // We'll use a fixed width container for consistent rendering
    return (
        <div
            ref={ref}
            style={{
                width: '794px',
                padding: '40px',
                background: '#fff',
                color: '#000',
                position: 'absolute',
                left: '-9999px',
                top: 0
            }}
        >
            {/* Header */}
            <div style={{ borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0' }}>현장 작업 보고서</h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#555' }}>
                    <div>
                        <strong>현장명:</strong> {job.siteTitle}
                    </div>
                    <div>
                        <strong>작업일:</strong> {typeof job.date === 'string' ? job.date : (job.date as any)?.toDate?.().toLocaleDateString()}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {sections.map((section) => {
                    const photos = photosBySection[section.id] || [];
                    const beforePhotos = photos.filter(p => p.type === 'BEFORE');
                    const afterPhotos = photos.filter(p => p.type === 'AFTER');

                    // Pair photos logic: Match BEFORE index with AFTER index
                    const maxCount = Math.max(beforePhotos.length, afterPhotos.length);
                    const rows = Array.from({ length: maxCount }).map((_, i) => ({
                        before: beforePhotos[i],
                        after: afterPhotos[i]
                    }));

                    if (rows.length === 0) return null;

                    return (
                        <div key={section.id} style={{ breakInside: 'avoid' }}>
                            <h2 style={{
                                fontSize: '18px',
                                fontWeight: 'bold',
                                borderLeft: '4px solid #3b82f6',
                                paddingLeft: '10px',
                                marginBottom: '15px',
                                background: '#f0f9ff',
                                padding: '8px 12px'
                            }}>
                                {section.title}
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {rows.map((row, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '15px' }}>
                                        {/* BEFORE */}
                                        <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{
                                                background: '#f97316',
                                                color: '#fff',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                padding: '4px 8px',
                                                textAlign: 'center'
                                            }}>
                                                BEFORE
                                            </div>
                                            <div style={{ width: '100%', height: '240px', background: '#eee' }}>
                                                {row.before ? (
                                                    <img
                                                        src={row.before.downloadUrl}
                                                        alt="Before"
                                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                        crossOrigin="anonymous"
                                                    />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '12px' }}>
                                                        (사진 없음)
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* AFTER */}
                                        <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{
                                                background: '#3b82f6',
                                                color: '#fff',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                padding: '4px 8px',
                                                textAlign: 'center'
                                            }}>
                                                AFTER
                                            </div>
                                            <div style={{ width: '100%', height: '240px', background: '#eee' }}>
                                                {row.after ? (
                                                    <img
                                                        src={row.after.downloadUrl}
                                                        alt="After"
                                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                        crossOrigin="anonymous"
                                                    />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '12px' }}>
                                                        (사진 없음)
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div style={{ marginTop: '50px', borderTop: '1px solid #ddd', paddingTop: '20px', textAlign: 'center', fontSize: '12px', color: '#888' }}>
                HellaCompany Field Log System
            </div>
        </div>
    );
});

export default ReportTemplate;

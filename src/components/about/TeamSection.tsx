import { useEffect, useState } from 'react';
import { Linkedin, Twitter, Mail } from 'lucide-react';
import { getTeam } from '@/services/store';
import type { TeamMember } from '@/types/index';

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function TeamSection() {
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => {
    let active = true;
    getTeam().then(data => { if (active) setTeam(data); });
    return () => { active = false; };
  }, []);

  if (team.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-14">
      <div className="text-center mb-10">
        <span className="text-amber-600 text-sm font-medium uppercase tracking-widest">Our People</span>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 text-balance">Meet Our Team</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {team.map(m => (
          <div key={m.id}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex flex-col items-center text-center">
            {m.photo_url ? (
              <img src={m.photo_url} alt={m.name}
                className="w-24 h-24 rounded-full object-cover mb-4 shrink-0" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-2xl mb-4 shrink-0">
                {initials(m.name)}
              </div>
            )}
            <p className="font-semibold text-gray-900">{m.name}</p>
            {m.role && <p className="text-amber-600 text-sm">{m.role}</p>}
            {m.bio && <p className="text-gray-500 text-sm mt-3 leading-relaxed text-pretty">{m.bio}</p>}
            {(m.linkedin_url || m.twitter_url || m.email) && (
              <div className="flex items-center justify-center gap-3 mt-4">
                {m.linkedin_url && (
                  <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer"
                    aria-label={`${m.name} on LinkedIn`}
                    className="text-gray-400 hover:text-amber-600 transition-colors">
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {m.twitter_url && (
                  <a href={m.twitter_url} target="_blank" rel="noopener noreferrer"
                    aria-label={`${m.name} on Twitter`}
                    className="text-gray-400 hover:text-amber-600 transition-colors">
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
                {m.email && (
                  <a href={`mailto:${m.email}`}
                    aria-label={`Email ${m.name}`}
                    className="text-gray-400 hover:text-amber-600 transition-colors">
                    <Mail className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

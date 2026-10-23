import { PrismaClient, RoleName, WorkMode } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const jobs = [
  {
    positionName: 'Frontend Stajyeri',
    department: 'Yazilim Gelistirme',
    description: 'React, TypeScript ve modern arayuz gelistirme sureclerinde ekibe destek olacak stajyer ariyoruz.',
    requiredSkills: ['React', 'TypeScript', 'HTML', 'CSS'],
    educationRequirement: 'Bilgisayar Muhendisligi, Yazilim Muhendisligi veya ilgili bolumlerde ogrenci olmak.',
    experienceRequirement: 'Temel frontend proje deneyimi tercih sebebidir.',
    workMode: WorkMode.HIBRIT
  },
  {
    positionName: 'Backend Stajyeri',
    department: 'Yazilim Gelistirme',
    description: 'NestJS ve PostgreSQL tabanli API gelistirme sureclerine katilacak stajyer ariyoruz.',
    requiredSkills: ['Node.js', 'NestJS', 'PostgreSQL', 'REST API'],
    educationRequirement: 'Bilgisayar veya yazilim alaninda lisans ogrencisi olmak.',
    experienceRequirement: 'Temel veritabani ve API bilgisi beklenir.',
    workMode: WorkMode.OFISTE
  },
  {
    positionName: 'Veri Analizi Stajyeri',
    department: 'Veri ve Analitik',
    description: 'Raporlama, veri temizleme ve dashboard hazirlama sureclerinde gorev alacak stajyer ariyoruz.',
    requiredSkills: ['SQL', 'Python', 'Excel', 'Power BI'],
    educationRequirement: 'Istatistik, Endustri Muhendisligi veya ilgili bolumlerde ogrenci olmak.',
    experienceRequirement: 'SQL sorgularina asinalik tercih sebebidir.',
    workMode: WorkMode.HIBRIT
  },
  {
    positionName: 'UI/UX Tasarim Stajyeri',
    department: 'Urun Tasarimi',
    description: 'Kullanici arastirmasi, wireframe ve prototip calismalarina destek olacak stajyer ariyoruz.',
    requiredSkills: ['Figma', 'UI Design', 'UX Research', 'Prototyping'],
    educationRequirement: 'Gorsel iletisim, endustriyel tasarim veya ilgili alanlarda ogrenci olmak.',
    experienceRequirement: 'Portfolyo sunabilmek tercih sebebidir.',
    workMode: WorkMode.UZAKTAN
  },
  {
    positionName: 'Mobil Uygulama Stajyeri',
    department: 'Mobil Teknolojiler',
    description: 'React Native ile mobil uygulama gelistirme ekibine destek olacak stajyer ariyoruz.',
    requiredSkills: ['React Native', 'JavaScript', 'Git', 'Mobile UI'],
    educationRequirement: 'Yazilim veya bilgisayar alaninda ogrenci olmak.',
    experienceRequirement: 'Kucuk olcekli mobil proje deneyimi tercih sebebidir.',
    workMode: WorkMode.HIBRIT
  },
  {
    positionName: 'DevOps Stajyeri',
    department: 'Platform ve Altyapi',
    description: 'CI/CD, container ve izleme sureclerinde ekibe destek olacak stajyer ariyoruz.',
    requiredSkills: ['Docker', 'Linux', 'GitHub Actions', 'CI/CD'],
    educationRequirement: 'Bilgisayar aglari, yazilim veya ilgili bolumlerde ogrenci olmak.',
    experienceRequirement: 'Linux komut satiri bilgisi beklenir.',
    workMode: WorkMode.OFISTE
  },
  {
    positionName: 'Siber Guvenlik Stajyeri',
    department: 'Bilgi Guvenligi',
    description: 'Guvenlik kontrolleri, log inceleme ve temel zafiyet analizlerinde gorev alacak stajyer ariyoruz.',
    requiredSkills: ['Network Security', 'Linux', 'OWASP', 'Log Analysis'],
    educationRequirement: 'Bilgi guvenligi, bilgisayar muhendisligi veya ilgili alanlarda ogrenci olmak.',
    experienceRequirement: 'OWASP Top 10 bilgisi tercih sebebidir.',
    workMode: WorkMode.HIBRIT
  },
  {
    positionName: 'Yapay Zeka Stajyeri',
    department: 'AI ve Otomasyon',
    description: 'LLM entegrasyonlari, veri hazirlama ve otomasyon akislarinda calisacak stajyer ariyoruz.',
    requiredSkills: ['Python', 'OpenAI API', 'Prompt Engineering', 'n8n'],
    educationRequirement: 'Bilgisayar, matematik veya veri bilimi alaninda ogrenci olmak.',
    experienceRequirement: 'Python ile temel proje gelistirmis olmak tercih sebebidir.',
    workMode: WorkMode.UZAKTAN
  },
  {
    positionName: 'QA Test Stajyeri',
    department: 'Kalite Guvence',
    description: 'Manuel test, hata raporlama ve regresyon test sureclerinde gorev alacak stajyer ariyoruz.',
    requiredSkills: ['Manual Testing', 'Test Case', 'Jira', 'API Testing'],
    educationRequirement: 'Yazilim, bilgisayar veya ilgili bolumlerde ogrenci olmak.',
    experienceRequirement: 'Temel test kavramlarini bilmek beklenir.',
    workMode: WorkMode.HIBRIT
  },
  {
    positionName: 'Urun Yonetimi Stajyeri',
    department: 'Urun',
    description: 'Kullanici ihtiyaclari, backlog takibi ve kabul kriterleri yaziminda destek olacak stajyer ariyoruz.',
    requiredSkills: ['Agile', 'User Story', 'Analytical Thinking', 'Documentation'],
    educationRequirement: 'Endustri Muhendisligi, Isletme, Bilgisayar veya ilgili bolumlerde ogrenci olmak.',
    experienceRequirement: 'Urun gelistirme sureclerine ilgi beklenir.',
    workMode: WorkMode.OFISTE
  }
];

async function main() {
  await prisma.interview.deleteMany();
  await prisma.application.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.project.deleteMany();
  await prisma.candidateSkill.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.job.deleteMany();
  await prisma.user.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.role.deleteMany();

  const [candidateRole, managerRole] = await Promise.all([
    prisma.role.create({ data: { name: RoleName.ADAY } }),
    prisma.role.create({ data: { name: RoleName.YONETICI } })
  ]);

  const passwordHash = await bcrypt.hash('Demo12345!', 12);

  const companyUser = await prisma.user.create({
    data: {
      email: 'zeynep.ceylin@demo.com',
      firstName: 'Zeynep',
      lastName: 'Ceylin',
      passwordHash,
      roleId: managerRole.id
    }
  });

  await prisma.user.create({
    data: {
      email: 'aday@demo.com',
      firstName: 'Demo',
      lastName: 'Aday',
      passwordHash,
      roleId: candidateRole.id,
      candidate: {
        create: {
          title: 'Stajyer Adayi',
          summary: 'Farkli alanlardaki staj ilanlarina basvuru yapmaya hazir aday profili.'
        }
      }
    }
  });

  for (const [index, job] of jobs.entries()) {
    const skills = await Promise.all(
      job.requiredSkills.map((name) =>
        prisma.skill.upsert({ where: { name }, update: {}, create: { name } })
      )
    );

    await prisma.job.create({
      data: {
        positionName: job.positionName,
        department: job.department,
        description: job.description,
        educationRequirement: job.educationRequirement,
        experienceRequirement: job.experienceRequirement,
        workMode: job.workMode,
        deadline: new Date(Date.now() + (index + 21) * 24 * 60 * 60 * 1000),
        createdById: companyUser.id,
        requiredSkills: { connect: skills.map((skill) => ({ id: skill.id })) }
      }
    });
  }

  const [users, candidates, jobsCount, skills] = await prisma.$transaction([
    prisma.user.count(),
    prisma.candidate.count(),
    prisma.job.count(),
    prisma.skill.count()
  ]);

  console.log({ users, candidates, jobs: jobsCount, skills, companyEmail: companyUser.email });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
